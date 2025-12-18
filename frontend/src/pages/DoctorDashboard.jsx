import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  LogOut,
  Search,
  User,
  MessageSquare,
  FileText,
  Calendar,
  Mail,
  Phone,
  Bot,
  Send,
  Loader,
  X,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { doctorAPI } from '../services/api';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientChats, setPatientChats] = useState([]);
  const [patientUploads, setPatientUploads] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [showFeedbackInline, setShowFeedbackInline] = useState(false);
  const [feedbackAccurate, setFeedbackAccurate] = useState(null);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [showFollowUpDoctor, setShowFollowUpDoctor] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await doctorAPI.getPatient(searchQuery);
      setSelectedPatient(response.data.patient);
      toast.success('Patient found!');

      // Load patient chats and uploads
      loadPatientData(searchQuery);
    } catch (error) {
      console.error('Search error:', error);
      toast.error(error.response?.data?.message || 'Patient not found');
      setSelectedPatient(null);
    } finally {
      setSearching(false);
    }
  };

  const loadPatientData = async (patientId) => {
    try {
      const [chatsRes, uploadsRes] = await Promise.all([
        doctorAPI.getPatientChats(patientId),
        doctorAPI.getPatientUploads(patientId),
      ]);

      setPatientChats(chatsRes.data.chats);
      setPatientUploads(uploadsRes.data.uploads);
    } catch (error) {
      console.error('Error loading patient data:', error);
      toast.error('Failed to load patient data');
    }
  };

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;

    setLoadingAI(true);
    try {
      const response = await doctorAPI.chatWithPatientContext(
        selectedPatient.patientId,
        {
          message: aiQuestion,
          sessionId: selectedChat?.sessionId,
        }
      );

      setAiResponse(response.data.response);
      setAiQuestion('');
      
      // Show inline feedback below AI response
      setShowFeedbackInline(true);
      setFeedbackAccurate(null);
      setShowFollowUpDoctor(false);
    } catch (error) {
      console.error('AI query error:', error);
      toast.error('Failed to get AI response');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleDoctorFeedback = (accurate) => {
    setFeedbackAccurate(accurate);
    if (!accurate) {
      setShowFollowUpDoctor(true);
    } else {
      toast.success('Thank you for confirming the accuracy! ✓');
      setShowFeedbackInline(false);
      setFeedbackAccurate(null);
    }
  };

  const handleSubmitDoctorFeedback = async () => {
    try {
      console.log('Doctor detailed feedback:', {
        accurate: feedbackAccurate,
        reason: feedbackReason,
        additionalDetails: additionalDetails
      });

      toast.success('Thank you for your detailed feedback. This helps improve our AI for better patient care. 🏥');

      // Reset and close
      setShowFeedbackInline(false);
      setFeedbackAccurate(null);
      setFeedbackReason('');
      setAdditionalDetails('');
      setShowFollowUpDoctor(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    }
  };

  const handleCloseDoctorFeedback = () => {
    setShowFeedbackInline(false);
    setFeedbackAccurate(null);
    setFeedbackReason('');
    setAdditionalDetails('');
    setShowFollowUpDoctor(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Portal</h1>
            <p className="text-sm text-gray-600">
              Dr. {user?.name} | {user?.specialization}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Search Patient</h2>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Patient ID (e.g., PT000001)"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {searching ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search
                </>
              )}
            </button>
          </form>
        </div>

        {/* Patient Details */}
        {selectedPatient && (
          <div className="flex gap-6">
            {/* Sidebar - Previous Sessions */}
            <div className="w-80 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-600" />
                  Previous Sessions
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Patient ID: <span className="font-semibold text-gray-900">{selectedPatient.patientId}</span>
                </p>
                <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
                  {patientChats.filter(chat => chat.messageCount > 0).length === 0 ? (
                    <p className="text-gray-500 text-center py-8 text-sm">
                      No previous sessions
                    </p>
                  ) : (
                    patientChats.filter(chat => chat.messageCount > 0).map((chat) => (
                      <div
                        key={chat.sessionId}
                        className={`border rounded-lg p-3 cursor-pointer transition ${
                          selectedChat?.sessionId === chat.sessionId
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                        }`}
                        onClick={() => setSelectedChat(chat)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-semibold text-sm text-gray-900">
                            {chat.sessionId.slice(0, 12)}...
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          {chat.messageCount} messages
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(chat.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 space-y-6">
              {/* Selected Chat Messages */}
              {selectedChat && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    Session: {selectedChat.sessionId.slice(0, 12)}...
                  </h2>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {selectedChat.messages && selectedChat.messages.length > 0 ? (
                      selectedChat.messages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded ${
                            msg.sender === 'patient'
                              ? 'bg-blue-100'
                              : 'bg-green-100'
                          }`}
                        >
                          <p className="text-xs font-semibold mb-1 text-gray-900">
                            {msg.sender === 'patient' ? 'Patient' : 'AI'}
                          </p>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">{msg.content}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(msg.timestamp).toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">No messages in this session</p>
                    )}
                  </div>
                </div>
              )}



              {/* Uploads */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Uploaded Files ({patientUploads.length})
                </h2>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {patientUploads.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No files uploaded
                    </p>
                  ) : (
                    patientUploads.map((upload) => (
                      <div
                        key={upload.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-900">{upload.fileName}</p>
                            <p className="text-sm text-gray-600">
                              {upload.category} • {(upload.fileSize / 1024).toFixed(1)} KB
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(upload.createdAt)}
                            </p>
                          </div>
                          <a
                            href={upload.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            View
                          </a>
                        </div>
                        {upload.extractedText && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                            <p className="text-gray-700 line-clamp-3">
                              {upload.extractedText}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* AI Assistant */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-600" />
                  Ask AI About Patient
                </h2>
                <form onSubmit={handleAskAI} className="space-y-4">
                  <textarea
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Ask a question about this patient's symptoms, history, or uploaded documents..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none text-gray-900 bg-white"
                    rows="3"
                  />
                  <button
                    type="submit"
                    disabled={loadingAI || !aiQuestion.trim()}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingAI ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Ask AI
                      </>
                    )}
                  </button>
                </form>

                {aiResponse && (
                  <div className="mt-4 space-y-3">
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <p className="text-sm font-semibold text-indigo-900 mb-2">
                        AI Response:
                      </p>
                      <p className="text-gray-700 whitespace-pre-wrap">{aiResponse}</p>
                    </div>

                    {/* Inline Doctor Feedback - Shows below AI response */}
                    {showFeedbackInline && (
                      <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">Response Accuracy Feedback</h4>
                          <button
                            onClick={handleCloseDoctorFeedback}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {!showFollowUpDoctor ? (
                          <div>
                            <p className="text-sm text-gray-700 mb-2">Is the AI response accurate?</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDoctorFeedback(true)}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center justify-center gap-2"
                              >
                                <ThumbsUp className="w-4 h-4" />
                                Yes, Accurate
                              </button>
                              <button
                                onClick={() => handleDoctorFeedback(false)}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium flex items-center justify-center gap-2"
                              >
                                <ThumbsDown className="w-4 h-4" />
                                No, Inaccurate
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm text-gray-700 font-medium">Please help us improve:</p>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Why is it not accurate? *
                              </label>
                              <textarea
                                value={feedbackReason}
                                onChange={(e) => setFeedbackReason(e.target.value)}
                                placeholder="e.g., Incorrect diagnosis, missing key symptoms, outdated information, contradicts medical guidelines..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm text-gray-900 bg-white"
                                rows="2"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                What additional details would help provide better responses?
                              </label>
                              <textarea
                                value={additionalDetails}
                                onChange={(e) => setAdditionalDetails(e.target.value)}
                                placeholder="e.g., Need more context from patient history, should reference specific test results, include differential diagnoses..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm text-gray-900 bg-white"
                                rows="2"
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={handleSubmitDoctorFeedback}
                                disabled={!feedbackReason.trim()}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Submit Feedback
                              </button>
                              <button
                                onClick={handleCloseDoctorFeedback}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
                              >
                                Skip
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedPatient && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Search for a Patient
            </h3>
            <p className="text-gray-500">
              Enter a Patient ID to view their chat history and uploaded files
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
