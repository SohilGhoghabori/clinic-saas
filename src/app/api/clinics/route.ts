import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("clinics")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clinics: data ?? [] });
}

function toClinicId(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const providedId = String(body.id ?? "").trim();
  const id = toClinicId(providedId || name);

  if (!name) {
    return NextResponse.json({ error: "Clinic name is required." }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: "Valid clinic id is required." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("clinics")
    .insert({ id, name })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clinic: data }, { status: 201 });
}
