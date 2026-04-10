import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function clinicIdFromRequest(request: Request) {
  return request.headers.get("x-clinic-id") ?? "central-clinic";
}

export async function GET(request: Request) {
  const clinicId = clinicIdFromRequest(request);
  const { data, error } = await supabaseAdmin
    .from("clinic_settings")
    .select("*")
    .eq("clinic_key", clinicId)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({
      settings: {
        clinic_key: clinicId,
        clinic_id: clinicId,
        clinic_name: "Sanctuary Health Center",
        primary_email: "admin@sanctuaryhealth.com",
        clinic_address: "742 Medical District Dr, Suite 100, San Francisco, CA",
        monday_open: "08:00 AM",
        monday_close: "06:00 PM",
        tuesday_open: "08:00 AM",
        tuesday_close: "06:00 PM",
        sunday_closed: true,
        slot_duration_minutes: 30,
        buffer_time_minutes: 10,
        high_risk_threshold: 70,
        automated_risk_reminders: true,
        auto_fill_rescheduling: false,
      },
    });
  }

  return NextResponse.json({ settings: data });
}

export async function PUT(request: Request) {
  const clinicId = clinicIdFromRequest(request);
  const body = await request.json();

  const payload = {
    clinic_key: clinicId,
    clinic_id: clinicId,
    clinic_name: String(body.clinic_name ?? "").trim(),
    primary_email: String(body.primary_email ?? "").trim(),
    clinic_address: String(body.clinic_address ?? "").trim(),
    monday_open: String(body.monday_open ?? "").trim(),
    monday_close: String(body.monday_close ?? "").trim(),
    tuesday_open: String(body.tuesday_open ?? "").trim(),
    tuesday_close: String(body.tuesday_close ?? "").trim(),
    sunday_closed: Boolean(body.sunday_closed),
    slot_duration_minutes: Number(body.slot_duration_minutes ?? 30),
    buffer_time_minutes: Number(body.buffer_time_minutes ?? 10),
    high_risk_threshold: Number(body.high_risk_threshold ?? 70),
    automated_risk_reminders: Boolean(body.automated_risk_reminders),
    auto_fill_rescheduling: Boolean(body.auto_fill_rescheduling),
    updated_at: new Date().toISOString(),
  };

  if (!payload.clinic_name || !payload.primary_email || !payload.clinic_address) {
    return NextResponse.json(
      { error: "clinic_name, primary_email, and clinic_address are required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("clinic_settings")
    .upsert(payload, { onConflict: "clinic_key" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
