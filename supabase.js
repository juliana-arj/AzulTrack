const SUPABASE_URL = "https://nniavbhqfpxskdfzbfkx.supabase.co";
const SUPABASE_KEY = "sb_publishable_I6KICBj_FPL6FZUXKMj93A_n6uZsY0I";

window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);