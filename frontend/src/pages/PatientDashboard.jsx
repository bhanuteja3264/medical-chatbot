import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  LogOut,
  Send,
  Upload,
  Image,
  FileText,
  Mic,
  Paperclip,
  User,
  Bot,
  Loader,
  X,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { chatAPI, uploadAPI } from '../services/api';

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [expandedExplanations, setExpandedExplanations] = useState({});
  const [showSatisfactionModal, setShowSatisfactionModal] = useState({});
  const [satisfactionDetails, setSatisfactionDetails] = useState('');
  const [responsePreferences, setResponsePreferences] = useState('');
  const [showFollowUp, setShowFollowUp] = useState({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    startNewSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startNewSession = async () => {
    try {
      const response = await chatAPI.startSession();
      setSessionId(response.data.sessionId);
      setMessages([
        {
          sender: 'ai',
          content: "Hello! I'm your AI medical assistant. How can I help you today? You can send me text messages, upload images, documents, or audio files.",
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start chat session');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() && selectedFiles.length === 0) return;

    setLoading(true);
    const uploadedFiles = [];

    try {
      // Upload files first if selected
      if (selectedFiles.length > 0) {
        setUploading(true);
        const formData = new FormData();
        
        // Append all files
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('sessionId', sessionId);

        const uploadResponse = await uploadAPI.uploadFile(formData);
        uploadedFiles.push(...uploadResponse.data.files);
        setUploading(false);

        toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
      }

      // Add user message
      const userMessage = {
        sender: 'patient',
        content: inputMessage || `Uploaded ${uploadedFiles.length} file(s)`,
        messageType: uploadedFiles.length > 0 ? uploadedFiles[0].category : 'text',
        files: uploadedFiles,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Send to AI - process first file
      const response = await chatAPI.sendMessage({
        sessionId,
        message: uploadedFiles.length > 0
          ? `${inputMessage || 'Please analyze these files'} [${uploadedFiles.length} file(s): ${uploadedFiles.map(f => f.fileName).join(', ')}]`
          : inputMessage,
        messageType: uploadedFiles.length > 0 ? uploadedFiles[0].category : 'text',
        fileUrl: uploadedFiles.length > 0 ? uploadedFiles[0].fileUrl : null,
        fileName: uploadedFiles.length > 0 ? uploadedFiles[0].fileName : null,
        fileType: uploadedFiles.length > 0 ? uploadedFiles[0].category : null,
      });

      // Add AI response
      const aiMessage = {
        sender: 'ai',
        content: response.data.aiResponse,
        explanation: response.data.explanation, // Add explanation from backend
        messageType: 'text',
        timestamp: new Date(),
        id: response.data.messageId || Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Show satisfaction modal below AI response
      setShowSatisfactionModal((prev) => ({ ...prev, [aiMessage.id]: true }));

      // Reset input
      setInputMessage('');
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }
    
    // Check each file size (50MB limit per file)
    const invalidFiles = files.filter(file => file.size > 50 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast.error('Each file must be less than 50MB');
      return;
    }

    setSelectedFiles(files);
    toast.success(`${files.length} file(s) selected`);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, {
          type: 'audio/webm',
        });
        
        setSelectedFiles([audioFile]);
        toast.success('Recording saved! Click Send to upload.');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast.success('🎤 Recording started...');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please grant permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
      toast.success('Recording stopped!');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const toggleExplanation = (index) => {
    setExpandedExplanations((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSatisfactionFeedback = async (messageId, satisfied) => {
    try {
      if (satisfied) {
        // Hide modal and show success
        setShowSatisfactionModal((prev) => ({ ...prev, [messageId]: false }));
        toast.success('Thank you for your feedback! 😊');
      } else {
        // Show follow-up questions
        setShowFollowUp((prev) => ({ ...prev, [messageId]: true }));
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleSubmitFollowUp = async (messageId) => {
    try {
      console.log('Patient follow-up feedback:', {
        messageId,
        details: satisfactionDetails,
        preferences: responsePreferences
      });

      toast.success('Thank you for the detailed feedback! We\'ll improve based on your input. 💙');
      
      // Hide modals and reset
      setShowSatisfactionModal((prev) => ({ ...prev, [messageId]: false }));
      setShowFollowUp((prev) => ({ ...prev, [messageId]: false }));
      setSatisfactionDetails('');
      setResponsePreferences('');
    } catch (error) {
      console.error('Error submitting follow-up:', error);
    }
  };

  const handleCloseFeedback = (messageId) => {
    setShowSatisfactionModal((prev) => ({ ...prev, [messageId]: false }));
    setShowFollowUp((prev) => ({ ...prev, [messageId]: false }));
    setSatisfactionDetails('');
    setResponsePreferences('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getFileIcon = (messageType) => {
    switch (messageType) {
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'audio':
        return <Mic className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Portal</h1>
            <p className="text-sm text-gray-600">
              Welcome, {user?.name} | Patient ID: {user?.patientId}
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

      {/* Chat Container */}
      <div className="flex-1 max-w-4xl mx-auto w-full p-4 flex flex-col">
        {/* Messages */}
        <div className="flex-1 bg-white rounded-lg shadow-lg p-4 mb-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.sender === 'patient' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex gap-3 max-w-[80%] ${
                    message.sender === 'patient' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.sender === 'patient'
                        ? 'bg-blue-600'
                        : 'bg-green-600'
                    }`}
                  >
                    {message.sender === 'patient' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>

                  {/* Message */}
                  <div className="flex-1">
                    <div
                      className={`px-4 py-3 rounded-lg ${
                        message.sender === 'patient'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {message.messageType !== 'text' && (
                        <div className="flex items-center gap-2 mb-2 text-sm opacity-80">
                          {getFileIcon(message.messageType)}
                          <span>{message.fileName || 'Attachment'}</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    
                    {/* SHAP Explanation for AI messages */}
                    {message.sender === 'ai' && message.explanation && (
                      <div className="mt-2">
                        <button
                          onClick={() => toggleExplanation(index)}
                          className="flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 rounded-lg text-sm text-amber-900 transition-all border border-amber-200"
                        >
                          <Lightbulb className="w-4 h-4 text-amber-600" />
                          <span className="font-medium">Why this response?</span>
                          {expandedExplanations[index] ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        
                        {expandedExplanations[index] && (
                          <div className="mt-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="flex items-start gap-2 mb-2">
                              <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <h4 className="font-semibold text-amber-900">AI Explainability (SHAP-Inspired)</h4>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {message.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Satisfaction Feedback - Shows below AI response */}
                    {message.sender === 'ai' && message.id && showSatisfactionModal[message.id] && (
                      <div className="mt-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-900">How was my response?</h4>
                          <button
                            onClick={() => handleCloseFeedback(message.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {!showFollowUp[message.id] ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSatisfactionFeedback(message.id, true)}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                            >
                              😊 Satisfied
                            </button>
                            <button
                              onClick={() => handleSatisfactionFeedback(message.id, false)}
                              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium"
                            >
                              😐 Not Satisfied
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm text-gray-700 font-medium">We'd like to understand better:</p>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Why are you not satisfied?
                              </label>
                              <textarea
                                value={satisfactionDetails}
                                onChange={(e) => setSatisfactionDetails(e.target.value)}
                                placeholder="e.g., Information not detailed enough, unclear explanation, didn't answer my question..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 bg-white"
                                rows="2"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Is there any more details I can provide?
                              </label>
                              <textarea
                                value={responsePreferences}
                                onChange={(e) => setResponsePreferences(e.target.value)}
                                placeholder="e.g., More examples, simpler language, step-by-step instructions, include sources..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 bg-white"
                                rows="2"
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSubmitFollowUp(message.id)}
                                disabled={!satisfactionDetails.trim() && !responsePreferences.trim()}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Submit Feedback
                              </button>
                              <button
                                onClick={() => handleCloseFeedback(message.id)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
                              >
                                Skip
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {(loading || uploading) && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="px-4 py-3 bg-gray-100 rounded-lg">
                    <Loader className="w-5 h-5 animate-spin text-gray-600" />
                    <p className="text-sm text-gray-600 mt-1">
                      {uploading ? 'Uploading file...' : 'Thinking...'}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          {selectedFiles.length > 0 && (
            <div className="mb-3 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  {selectedFiles.length} file(s) selected
                </span>
                <button
                  onClick={() => setSelectedFiles([])}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <Paperclip className="w-3 h-3" />
                    <span>{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
              className="hidden"
              multiple
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              title="Upload file"
              disabled={isRecording}
            >
              <Upload className="w-5 h-5 text-gray-600" />
            </button>

            <button
              type="button"
              onClick={toggleRecording}
              className={`p-3 rounded-lg transition ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <Mic className={`w-5 h-5 ${isRecording ? 'text-white' : 'text-gray-600'}`} />
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message or upload a file..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white"
              disabled={loading || uploading || isRecording}
            />

            <button
              type="submit"
              disabled={(!inputMessage.trim() && selectedFiles.length === 0) || loading || uploading || isRecording}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-2">
            {isRecording 
              ? '🎤 Recording audio... Click microphone to stop' 
              : 'Supported: Images, Audio, Video, PDF, Word, Text (Max 50MB per file, up to 5 files) | Click mic to record audio'}
          </p>
        </div>
      </div>
    </div>
  );
}
