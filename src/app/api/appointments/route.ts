import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function clinicIdFromRequest(request: Request) {
  return request.headers.get("x-clinic-id") ?? "central-clinic";
}

export async function GET(request: Request) {
  const clinicId = clinicIdFromRequest(request);
  const { data, error } = await supabaseAdmin
    .from("appointments")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("appointment_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ appointments: data ?? [] });
}

export async function POST(request: Request) {
  const clinicId = clinicIdFromRequest(request);
  const body = await request.json();
  const patientId = String(body.patient_id ?? "").trim();
  const doctorName = String(body.doctor_name ?? "").trim();
  const appointmentType = String(body.appointment_type ?? "").trim();
  // Support legacy payload field name while storing into `appointment_at`.
  const appointmentAt = String(
    body.appointment_at ?? body.appointment_time ?? ""
  ).trim();
  const notes = String(body.notes ?? "").trim();

  if (!patientId || !doctorName || !appointmentType || !appointmentAt) {
    return NextResponse.json(
      {
        error:
          "patient_id, doctor_name, appointment_type, and appointment_at are required.",
      },
      { status: 400 }
    );
  }

  const { data: patient, error: patientError } = await supabaseAdmin
    .from("patients")
    .select("id, name")
    .eq("id", patientId)
    .single();

  if (patientError || !patient) {
    return NextResponse.json(
      { error: "Selected patient does not exist." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .insert({
      clinic_id: clinicId,
      patient_id: patientId,
      patient_name: patient.name,
      doctor_name: doctorName,
      appointment_type: appointmentType,
      appointment_at: appointmentAt,
      no_show: false,
      notes: notes || null,
      status: "scheduled",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ appointment: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const id = String(body.id ?? "").trim();
  const doctorName =
    body.doctor_name === undefined
      ? undefined
      : String(body.doctor_name ?? "").trim();
  const appointmentType =
    body.appointment_type === undefined
      ? undefined
      : String(body.appointment_type ?? "").trim();
  const rawAppointmentAt =
    body.appointment_at ?? body.appointment_time ?? undefined;
  const status =
    body.status === undefined ? undefined : String(body.status ?? "").trim();
  const noShow =
    body.no_show === true || body.no_show === false ? body.no_show : undefined;
  const notes =
    body.notes === undefined ? undefined : String(body.notes ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const updates: Record<string, string | boolean | null> = {};
  if (doctorName !== undefined) updates.doctor_name = doctorName;
  if (appointmentType !== undefined) updates.appointment_type = appointmentType;
  if (rawAppointmentAt !== undefined) {
    const parsed = new Date(String(rawAppointmentAt));
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "Invalid appointment_at format." },
        { status: 400 }
      );
    }
    updates.appointment_at = parsed.toISOString();
  }
  if (status !== undefined) updates.status = status;
  if (noShow !== undefined) updates.no_show = noShow;
  if (notes !== undefined) updates.notes = notes || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields provided for update." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ appointment: data });
}

export async function PUT(request: Request) {
  return PATCH(request);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get("id") ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("appointments")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
