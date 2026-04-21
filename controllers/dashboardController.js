import Interview from "../models/Interview.js";
import Candidate from "../models/Candidate.js";
import Dashboard from "../models/Dashboard.js";

export const getDashboardOverview = async (req, res) => {
  try {

    const totalCandidates = await Candidate.countDocuments();
    const scheduledInterviews = await Interview.countDocuments({ status: "Scheduled" });
    const completedInterviews = await Interview.countDocuments({ status: "Completed" });
    const pendingReviews = await Interview.countDocuments({ status: "Pending" });


    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await Interview.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          interviews: { $sum: 1 },
          candidates: { $addToSet: "$candidate" }
        }
      },
      {
        $project: {
          month: {
            $let: {
              vars: {
                monthsInString: [
                  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                ]
              },
              in: {
                $concat: [
                  { $arrayElemAt: ["$$monthsInString", "$_id.month"] },
                  " ",
                  { $toString: "$_id.year" }
                ]
              }
            }
          },
          interviews: 1,
          candidates: { $size: "$candidates" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    // Get status distribution
    const statusDistribution = await Interview.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          color: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", "Pending"] }, then: "#fbbf24" },
                { case: { $eq: ["$_id", "Scheduled"] }, then: "#60a5fa" },
                { case: { $eq: ["$_id", "Completed"] }, then: "#34d399" }
              ],
              default: "#9ca3af"
            }
          },
          _id: 0
        }
      }
    ]);

    // Get recent candidates (last 5)
    const recentCandidates = await Candidate.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email position status createdAt");

    // Get upcoming interviews (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingInterviews = await Interview.find({
      date: {
        $gte: new Date().toISOString().split('T')[0],
        $lte: nextWeek.toISOString().split('T')[0]
      },
      status: { $in: ["Pending", "Scheduled"] }
    })
      .populate('candidate', 'name position')
      .sort({ date: 1, time: 1 })
      .limit(5);

    // Format upcoming interviews
    const formattedUpcomingInterviews = upcomingInterviews.map(interview => ({
      candidate: interview.candidate?.name || 'Unknown Candidate',
      position: interview.candidate?.position || 'No Position',
      time: interview.time || 'Not set',
      type: interview.round || '1st Round',
      date: interview.date
    }));

    // Format recent candidates with avatars
    const formattedRecentCandidates = recentCandidates.map(candidate => ({
      name: candidate.name,
      position: candidate.position,
      status: candidate.status,
      date: candidate.createdAt.toISOString().split('T')[0],
      avatar: candidate.name.split(' ').map(n => n[0]).join('').toUpperCase()
    }));

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalCandidates,
          scheduledInterviews,
          completedInterviews,
          pendingReviews
        },
        charts: {
          monthlyStats,
          statusDistribution
        },
        recentCandidates: formattedRecentCandidates,
        upcomingInterviews: formattedUpcomingInterviews
      }
    });

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
      error: error.message
    });
  }
};

// Get Dashboard Stats Only (for quick updates)
export const 
getDashboardStats = async (req, res) => {
  try {
    const totalCandidates = await Candidate.countDocuments();
    const scheduledInterviews = await Interview.countDocuments({ status: "Scheduled" });
    const completedInterviews = await Interview.countDocuments({ status: "Completed" });
    const pendingReviews = await Interview.countDocuments({ status: "Pending" });

    res.status(200).json({
      success: true,
      data: {
        totalCandidates,
        scheduledInterviews,
        completedInterviews,
        pendingReviews
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard stats",
      error: error.message
    });
  }
};