import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function clinicIdFromRequest(request: Request) {
  return request.headers.get("x-clinic-id") ?? "central-clinic";
}

export async function GET(request: Request) {
  const clinicId = clinicIdFromRequest(request);
  const { data, error } = await supabaseAdmin
    .from("staff_users")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}

export async function POST(request: Request) {
  const clinicId = clinicIdFromRequest(request);
  const body = await request.json();
  const fullName = String(body.full_name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "").trim();
  const role = String(body.role ?? "").trim();
  const department = String(body.department ?? "").trim();
  const status = String(body.status ?? "Active").trim();

  if (!fullName || !email || !role || !department) {
    return NextResponse.json(
      { error: "full_name, email, role, and department are required." },
      { status: 400 }
    );
  }

  let authUserId: string | null = null;
  if (password) {
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role },
      });
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
    authUserId = authData.user?.id ?? null;
  }

  const { data, error } = await supabaseAdmin
    .from("staff_users")
    .insert({
      clinic_id: clinicId,
      auth_user_id: authUserId,
      full_name: fullName,
      email,
      role,
      department,
      status,
      last_login_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const id = String(body.id ?? "").trim();
  const fullName =
    body.full_name === undefined ? undefined : String(body.full_name ?? "").trim();
  const email =
    body.email === undefined ? undefined : String(body.email ?? "").trim();
  const role = body.role === undefined ? undefined : String(body.role ?? "").trim();
  const department =
    body.department === undefined
      ? undefined
      : String(body.department ?? "").trim();
  const status =
    body.status === undefined ? undefined : String(body.status ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (fullName !== undefined) updates.full_name = fullName;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role;
  if (department !== undefined) updates.department = department;
  if (status !== undefined) updates.status = status;
  updates.last_login_at = new Date().toISOString();

  if (Object.keys(updates).length === 1) {
    return NextResponse.json(
      { error: "No fields provided for update." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("staff_users")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
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

  const { error } = await supabaseAdmin.from("staff_users").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
