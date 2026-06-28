"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { User, Mail, Building2, Phone, Globe, FileText, Save } from "lucide-react";
import toast from "react-hot-toast";

interface Profile {
  full_name: string;
  agent_name: string;
  email: string;
  brokerage: string;
  license_number: string;
  phone: string;
  website: string;
  bio: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    agent_name: "",
    email: "",
    brokerage: "",
    license_number: "",
    phone: "",
    website: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile({
          full_name: data.full_name ?? "",
          agent_name: data.agent_name ?? "",
          email: user.email ?? "",
          brokerage: data.brokerage ?? "",
          license_number: data.license_number ?? "",
          phone: data.phone ?? "",
          website: data.website ?? "",
          bio: data.bio ?? "",
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: profile.full_name,
        agent_name: profile.agent_name,
        brokerage: profile.brokerage,
        license_number: profile.license_number,
        phone: profile.phone,
        website: profile.website,
        bio: profile.bio,
      });

      if (error) throw error;
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    );
  }

  const fields = [
    {
      key: "full_name",
      label: "Full Name",
      icon: User,
      type: "text",
      placeholder: "Sarah Johnson",
    },
    {
      key: "agent_name",
      label: "Display Name (shown on clips)",
      icon: User,
      type: "text",
      placeholder: "Sarah J. Real Estate",
    },
    {
      key: "email",
      label: "Email",
      icon: Mail,
      type: "email",
      placeholder: "agent@realty.com",
      disabled: true,
    },
    {
      key: "brokerage",
      label: "Brokerage",
      icon: Building2,
      type: "text",
      placeholder: "Century 21, Coldwell Banker, Compass...",
    },
    {
      key: "license_number",
      label: "License Number",
      icon: FileText,
      type: "text",
      placeholder: "DRE #01234567",
    },
    {
      key: "phone",
      label: "Phone",
      icon: Phone,
      type: "tel",
      placeholder: "(555) 123-4567",
    },
    {
      key: "website",
      label: "Website",
      icon: Globe,
      type: "url",
      placeholder: "https://youragentsite.com",
    },
  ] as const;

  return (
    <div className="max-w-2xl space-y-8 animate-slide-up">
      <div>
        <h1 className="page-title">Agent Profile</h1>
        <p className="text-slate-400 text-sm mt-1">
          Your info is used to enhance open house overlays and clip metadata
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
          {fields.map(({ key, label, icon: Icon, type, placeholder, disabled }) => (
            <div key={key}>
              <label className="label" htmlFor={key}>
                {label}
              </label>
              <div className="relative">
                <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id={key}
                  type={type}
                  value={profile[key as keyof Profile]}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={placeholder}
                  className="input-field pl-10"
                  disabled={disabled}
                />
              </div>
            </div>
          ))}

          <div>
            <label className="label" htmlFor="bio">
              Bio / Tagline
            </label>
            <textarea
              id="bio"
              value={profile.bio}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, bio: e.target.value }))
              }
              placeholder="Top-producing agent with 10+ years in the Bay Area market..."
              className="input-field min-h-[80px] resize-y"
              maxLength={300}
            />
            <p className="text-xs text-slate-600 mt-1">
              {profile.bio.length}/300 characters
            </p>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={saving}
          icon={<Save className="w-4 h-4" />}
          className="w-full"
        >
          Save Profile
        </Button>
      </form>
    </div>
  );
}
