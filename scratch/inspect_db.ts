import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log("Inspecting 'assignments' table...");
  const { data: assignments, error: aError } = await supabase.from("assignments").select("*").limit(1);
  if (aError) console.error("Error fetching assignments:", aError);
  else console.log("Assignments columns:", Object.keys(assignments[0] || {}), "\nSample:", assignments[0]);

  console.log("\nInspecting 'profiles' table...");
  const { data: profiles, error: pError } = await supabase.from("profiles").select("*").limit(1);
  if (pError) console.error("Error fetching profiles:", pError);
  else console.log("Profiles columns:", Object.keys(profiles[0] || {}), "\nSample:", profiles[0]);

  console.log("\nInspecting 'submissions' table...");
  const { data: submissions, error: sError } = await supabase.from("submissions").select("*").limit(1);
  if (sError) console.error("Error fetching submissions:", sError);
  else console.log("Submissions columns:", Object.keys(submissions[0] || {}), "\nSample:", submissions[0]);
}

inspect();
