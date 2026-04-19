import { useEffect, useState } from "react";
import { settingService } from "../lib/api";
import { Settings2, Save, RefreshCw } from "lucide-react";

const PRESET_SETTINGS = [
  {
    key: "maintenance_mode",
    label: "Maintenance Mode",
    description: "ปิดระบบชั่วคราว — แอปจะแสดง banner แจ้งเตือน user",
    type: "boolean",
    defaultValue: false,
  },
  {
    key: "allow_registration",
    label: "Allow Registration",
    description: "เปิด/ปิดการสมัครสมาชิกใหม่",
    type: "boolean",
    defaultValue: true,
  },
  {
    key: "max_post_media",
    label: "Max Post Media",
    description: "จำนวนรูป/วิดีโอสูงสุดต่อโพสต์",
    type: "number",
    defaultValue: 10,
  },
];

interface SettingsProps {
  currentUser: any;
}

export default function Settings({ currentUser }: SettingsProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [savedValues, setSavedValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Record<string, string>>({});

  const ALL_KEYS = [...PRESET_SETTINGS.map(s => s.key), "app_announcement", "app_announcement_duration"];

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await settingService.getAll();
      const map: Record<string, any> = { app_announcement: "", app_announcement_duration: 0 };
      PRESET_SETTINGS.forEach(s => { map[s.key] = s.defaultValue; });

      data.forEach((s: any) => {
        if (ALL_KEYS.includes(s.key)) map[s.key] = s.value;
        if (s.updatedBy) {
          setLastUpdated(prev => ({ ...prev, [s.key]: `Last updated by ${s.updatedBy.fullName}` }));
        }
      });

      setValues(map);
      setSavedValues(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async (key: string, description: string) => {
    setSaving(key);
    try {
      await settingService.update(key, values[key], description, currentUser.id);
      setSavedValues(prev => ({ ...prev, [key]: values[key] }));
      setLastUpdated(prev => ({ ...prev, [key]: `Last updated by ${currentUser.fullName}` }));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAnnouncement = async () => {
    setSaving("app_announcement");
    try {
      await Promise.all([
        settingService.update("app_announcement", values["app_announcement"], "App announcement text", currentUser.id),
        settingService.update("app_announcement_duration", values["app_announcement_duration"], "Announcement duration in minutes", currentUser.id),
      ]);
      setSavedValues(prev => ({
        ...prev,
        app_announcement: values["app_announcement"],
        app_announcement_duration: values["app_announcement_duration"],
      }));
      setLastUpdated(prev => ({ ...prev, app_announcement: `Last updated by ${currentUser.fullName}` }));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
  };

  if (currentUser?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Settings2 size={40} className="text-slate-600" />
        <p className="text-slate-500 font-bold">Access denied — Super Admin only</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  const announcementDirty =
    values["app_announcement"] !== savedValues["app_announcement"] ||
    values["app_announcement_duration"] !== savedValues["app_announcement_duration"];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
          <Settings2 size={20} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-white font-black text-xl">System Settings</h1>
          <p className="text-slate-500 text-xs">จัดการการตั้งค่าระดับระบบ</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Maintenance Mode & Allow Registration */}
        {PRESET_SETTINGS.filter(p => p.key !== "max_post_media").map((preset) => {
          const isDirty = values[preset.key] !== savedValues[preset.key];
          return (
            <div key={preset.key} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-bold text-sm">{preset.label}</p>
                    {isDirty && <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Unsaved</span>}
                  </div>
                  <p className="text-slate-400 text-xs mb-4">{preset.description}</p>
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => setValues(prev => ({ ...prev, [preset.key]: !prev[preset.key] }))}
                      className={`w-11 h-6 rounded-full cursor-pointer transition-colors flex items-center px-0.5 ${values[preset.key] ? "bg-violet-600" : "bg-slate-600"}`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${values[preset.key] ? "translate-x-5" : "translate-x-0"}`} />
                    </div>
                    <span className={`text-sm font-bold ${values[preset.key] ? "text-violet-400" : "text-slate-500"}`}>
                      {values[preset.key] ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  {lastUpdated[preset.key] && <p className="text-slate-600 text-[10px] mt-2">{lastUpdated[preset.key]}</p>}
                </div>
                <button
                  onClick={() => handleSave(preset.key, preset.description)}
                  disabled={!isDirty || saving === preset.key}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${isDirty ? "bg-violet-600 hover:bg-violet-500 text-white" : "bg-slate-700 text-slate-500 cursor-not-allowed"}`}
                >
                  {saving === preset.key ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                  Save
                </button>
              </div>
            </div>
          );
        })}

        {/* App Announcement — combined card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-white font-bold text-sm">App Announcement</p>
                {announcementDirty && <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Unsaved</span>}
              </div>
              <p className="text-slate-400 text-xs mb-4">ข้อความประกาศ global ที่แสดงบนแอป — ว่างเปล่า = ไม่แสดง</p>
              <input
                type="text"
                value={values["app_announcement"] ?? ""}
                onChange={e => setValues(prev => ({ ...prev, app_announcement: e.target.value }))}
                placeholder="ว่างเปล่า = ไม่แสดง"
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 mb-3"
              />
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={values["app_announcement_duration"] ?? 0}
                  min={0}
                  onChange={e => setValues(prev => ({ ...prev, app_announcement_duration: Number(e.target.value) }))}
                  className="w-24 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500"
                />
                <span className="text-slate-400 text-sm">นาที</span>
                <span className="text-slate-600 text-xs">(0 = แสดงตลอดเวลา)</span>
              </div>
              {lastUpdated["app_announcement"] && <p className="text-slate-600 text-[10px] mt-2">{lastUpdated["app_announcement"]}</p>}
            </div>
            <button
              onClick={handleSaveAnnouncement}
              disabled={!announcementDirty || saving === "app_announcement"}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${announcementDirty ? "bg-violet-600 hover:bg-violet-500 text-white" : "bg-slate-700 text-slate-500 cursor-not-allowed"}`}
            >
              {saving === "app_announcement" ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              Save
            </button>
          </div>
        </div>

        {/* Max Post Media — bottom */}
        {PRESET_SETTINGS.filter(p => p.key === "max_post_media").map((preset) => {
          const isDirty = values[preset.key] !== savedValues[preset.key];
          return (
            <div key={preset.key} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-bold text-sm">{preset.label}</p>
                    {isDirty && <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Unsaved</span>}
                  </div>
                  <p className="text-slate-400 text-xs mb-4">{preset.description}</p>
                  <input
                    type="number"
                    value={values[preset.key] ?? 0}
                    min={1} max={20}
                    onChange={e => setValues(prev => ({ ...prev, [preset.key]: Number(e.target.value) }))}
                    className="w-24 bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500"
                  />
                  {lastUpdated[preset.key] && <p className="text-slate-600 text-[10px] mt-2">{lastUpdated[preset.key]}</p>}
                </div>
                <button
                  onClick={() => handleSave(preset.key, preset.description)}
                  disabled={!isDirty || saving === preset.key}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${isDirty ? "bg-violet-600 hover:bg-violet-500 text-white" : "bg-slate-700 text-slate-500 cursor-not-allowed"}`}
                >
                  {saving === preset.key ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                  Save
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
