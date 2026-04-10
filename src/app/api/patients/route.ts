import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function clinicIdFromRequest(request: Request) {
  return request.headers.get("x-clinic-id") ?? "central-clinic";
}

export async function GET(request: Request) {
  const clinicId = clinicIdFromRequest(request);
  const { data, error } = await supabaseAdmin
    .from("patients")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ patients: data ?? [] });
}

export async function POST(request: Request) {
  const clinicId = clinicIdFromRequest(request);
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const dob = String(body.dob ?? "").trim();
  const gender = String(body.gender ?? "").trim();

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("patients")
    .insert({
      clinic_id: clinicId,
      name,
      email,
      phone: phone || null,
      dob: dob || null,
      gender: gender || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ patient: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const id = String(body.id ?? "").trim();
  const name = body.name === undefined ? undefined : String(body.name ?? "").trim();
  const email =
    body.email === undefined ? undefined : String(body.email ?? "").trim();
  const phone =
    body.phone === undefined ? undefined : String(body.phone ?? "").trim();
  const dob = body.dob === undefined ? undefined : String(body.dob ?? "").trim();
  const gender =
    body.gender === undefined ? undefined : String(body.gender ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone || null;
  if (dob !== undefined) updates.dob = dob || null;
  if (gender !== undefined) updates.gender = gender || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields provided for update." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("patients")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ patient: data });
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

  const { error } = await supabaseAdmin.from("patients").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
