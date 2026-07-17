import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { User, Lock, Shield, Save, CheckCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { PageShell } from "./Dashboard";
import { useAuth } from "../lib/auth";

const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your favorite book?",
  "What is your favorite movie?",
  "What was the make of your first car?",
];

export default function UserProfile() {
  const { t } = useTranslation();
  const P = (k) => t(`page.${k}`);
  const { user } = useAuth();

  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [sec, setSec] = useState({ security_question: "", security_answer: "" });
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name || "", email: user.email || "", phone: user.phone || "" });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.patch("/users/profile", profile);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Update failed");
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (pw.new_password !== pw.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    if (pw.new_password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      await api.post("/users/change-password", { current_password: pw.current_password, new_password: pw.new_password });
      toast.success("Password changed");
      setPw({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Password change failed");
    }
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    if (!sec.security_question || !sec.security_answer) {
      toast.error("Please fill in both question and answer");
      return;
    }
    try {
      await api.patch(`/users/${user.id}/security`, sec);
      toast.success("Security question saved");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed");
    }
  };

  return (
    <PageShell title="My Profile" subtitle="Manage your account details">
      <div className="p-6 h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Profile Form */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E60000]/10 flex items-center justify-center">
                <User className="w-5 h-5 text-[#E60000]" />
              </div>
              <div>
                <div className="font-display font-black text-lg">Profile Information</div>
                <div className="text-xs text-zinc-500">Update your personal details</div>
              </div>
            </div>
            <form onSubmit={handleProfileSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Name <span className="text-[#E60000]">*</span></label>
                <input
                  value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  required
                  className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Email <span className="text-[#E60000]">*</span></label>
                <input
                  type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  required
                  className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Phone</label>
                <input
                  value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Role</label>
                <input
                  value={user?.role || ""} disabled
                  className="w-full h-11 border border-zinc-200 rounded-lg px-4 text-sm bg-zinc-50 text-zinc-500 cursor-not-allowed"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button type="submit"
                  className="h-11 px-6 bg-[#E60000] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000] transition-colors flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Right Column - Change Password + Security Question */}
          <div className="space-y-6">
            {/* Change Password */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-zinc-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-zinc-900" />
                </div>
                <div>
                  <div className="font-display font-black text-lg">Change Password</div>
                  <div className="text-xs text-zinc-500">Update your login password</div>
                </div>
              </div>
              <form onSubmit={handlePasswordSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPw.current ? "text" : "password"}
                      value={pw.current_password}
                      onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
                      required
                      className="w-full h-11 border border-zinc-300 rounded-lg px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                    />
                    <button type="button" onClick={() => setShowPw({ ...showPw, current: !showPw.current })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                      {showPw.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw.new ? "text" : "password"}
                      value={pw.new_password}
                      onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
                      required
                      className="w-full h-11 border border-zinc-300 rounded-lg px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                    />
                    <button type="button" onClick={() => setShowPw({ ...showPw, new: !showPw.new })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                      {showPw.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPw.confirm ? "text" : "password"}
                      value={pw.confirm_password}
                      onChange={(e) => setPw({ ...pw, confirm_password: e.target.value })}
                      required
                      className="w-full h-11 border border-zinc-300 rounded-lg px-4 pr-10 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                    />
                    <button type="button" onClick={() => setShowPw({ ...showPw, confirm: !showPw.confirm })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                      {showPw.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit"
                    className="h-11 px-6 bg-zinc-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Change Password
                  </button>
                </div>
              </form>
            </div>

            {/* Security Question */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-zinc-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="font-display font-black text-lg">Security Question</div>
                  <div className="text-xs text-zinc-500">Set a security question for account recovery</div>
                </div>
              </div>
              <form onSubmit={handleSecuritySubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Security Question</label>
                  <select
                    value={sec.security_question}
                    onChange={(e) => setSec({ ...sec, security_question: e.target.value })}
                    required
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm bg-white"
                  >
                    <option value="">-- Select a question --</option>
                    {SECURITY_QUESTIONS.map((q, i) => (
                      <option key={i} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Your Answer</label>
                  <input
                    value={sec.security_answer}
                    onChange={(e) => setSec({ ...sec, security_answer: e.target.value })}
                    required
                    placeholder="Enter your answer"
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit"
                    className="h-11 px-6 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Save Security Question
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
