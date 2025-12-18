import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { UserPlus, Mail, Lock, User, Phone, Stethoscope, FileText, Calendar, ExternalLink, ShieldCheck } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: '',
    // Doctor fields
    specialization: '',
    licenseNumber: '',
    doctorConsent: false,
    // Patient fields
    abhaId: '',
    dateOfBirth: '',
    gender: '',
    dataConsent: false,
  });
  const [loading, setLoading] = useState(false);
  const [showAbhaInfo, setShowAbhaInfo] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleSelect = (role) => {
    setFormData({ ...formData, role });
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate patient-specific requirements
    if (formData.role === 'patient') {
      if (!formData.abhaId || formData.abhaId.trim() === '') {
        toast.error('ABHA ID is required for patient registration');
        return;
      }
      if (!formData.dataConsent) {
        toast.error('Please provide consent for data usage');
        return;
      }
    }

    // Validate doctor-specific requirements
    if (formData.role === 'doctor') {
      if (!formData.doctorConsent) {
        toast.error('Please accept the professional conduct agreement');
        return;
      }
    }

    setLoading(true);

    try {
      const response = await authAPI.register(formData);
      const { token, user } = response.data;

      setAuth(user, token);
      toast.success(response.data.message || 'Registration successful!');

      // Redirect based on role
      if (user.role === 'doctor') {
        navigate('/doctor');
      } else {
        navigate('/patient');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <UserPlus className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
            <p className="text-gray-600 mt-2">
              {step === 1 ? 'Choose your account type' : 'Fill in your details'}
            </p>
          </div>

          {/* Step 1: Role Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <button
                onClick={() => handleRoleSelect('patient')}
                className="w-full p-6 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-gray-900">I'm a Patient</h3>
                    <p className="text-gray-600">Get AI-powered medical assistance</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect('doctor')}
                className="w-full p-6 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition">
                    <Stethoscope className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-gray-900">I'm a Doctor</h3>
                    <p className="text-gray-600">Professional medical consultation platform</p>
                  </div>
                </div>
              </button>

              <div className="text-center mt-6">
                <Link to="/login" className="text-blue-600 hover:underline">
                  Already have an account? Sign in
                </Link>
              </div>
            </div>
          )}

          {/* Step 2: Registration Form */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength="6"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white"
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
              </div>

              {/* Doctor-specific fields */}
              {formData.role === 'doctor' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Specialization <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Stethoscope className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          name="specialization"
                          value={formData.specialization}
                          onChange={handleChange}
                          required
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white"
                          placeholder="Cardiology, General, etc."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        License Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          name="licenseNumber"
                          value={formData.licenseNumber}
                          onChange={handleChange}
                          required
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white"
                          placeholder="MED123456"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Doctor Professional Conduct Agreement */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="doctorConsent"
                        name="doctorConsent"
                        checked={formData.doctorConsent}
                        onChange={(e) => setFormData({ ...formData, doctorConsent: e.target.checked })}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <label htmlFor="doctorConsent" className="text-sm text-gray-700">
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldCheck className="w-4 h-4 text-green-600" />
                          <span className="font-semibold">Professional Conduct Agreement <span className="text-red-500">*</span></span>
                        </div>
                        <p>I hereby confirm and agree to the following:</p>
                        <ul className="mt-2 ml-4 space-y-1 list-disc">
                          <li>I am a licensed medical professional with valid credentials</li>
                          <li>I will access patient data <strong>only for legitimate medical purposes</strong></li>
                          <li>I will maintain strict patient confidentiality and data privacy</li>
                          <li>I will use patient information solely for diagnosis, treatment, and medical consultation</li>
                          <li>I will not share, sell, or misuse patient data under any circumstances</li>
                          <li>I understand that unauthorized access or misuse will result in account termination and legal action</li>
                          <li>I will comply with HIPAA regulations and medical ethics guidelines</li>
                          <li>I will provide accurate, evidence-based medical advice to the best of my ability</li>
                        </ul>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Patient-specific fields */}
              {formData.role === 'patient' && (
                <div className="space-y-4 pt-4 border-t">
                  {/* ABHA ID Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ABHA ID <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="abhaId"
                        value={formData.abhaId}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white"
                        placeholder="Enter your 14-digit ABHA ID"
                        maxLength="14"
                      />
                    </div>
                    <div className="mt-2 flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAbhaInfo(!showAbhaInfo)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        What is ABHA ID?
                      </button>
                      <span className="text-gray-400">|</span>
                      <a
                        href="https://abha.abdm.gov.in/abha/v3/register"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Don't have ABHA ID? Register here
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {showAbhaInfo && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
                        <p className="font-semibold mb-1">ABHA (Ayushman Bharat Health Account)</p>
                        <p>A unique 14-digit health ID that securely stores your health records digitally. Required for accessing medical services in India.</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 bg-white"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Data Consent */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="dataConsent"
                        name="dataConsent"
                        checked={formData.dataConsent}
                        onChange={(e) => setFormData({ ...formData, dataConsent: e.target.checked })}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <label htmlFor="dataConsent" className="text-sm text-gray-700">
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldCheck className="w-4 h-4 text-green-600" />
                          <span className="font-semibold">Data Usage Consent <span className="text-red-500">*</span></span>
                        </div>
                        <p>I hereby provide my consent to use my personal health data, medical history, chat conversations, and uploaded documents for <strong>diagnosis purposes only</strong>. I understand that:</p>
                        <ul className="mt-2 ml-4 space-y-1 list-disc">
                          <li>My data will be securely stored and encrypted</li>
                          <li>Authorized doctors can access my data using my Patient ID</li>
                          <li>Data will be used solely for medical diagnosis and treatment</li>
                          <li>I can revoke this consent at any time</li>
                        </ul>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
