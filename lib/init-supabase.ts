import { supabase } from "./supabase"

export async function initializeDatabase() {
  try {
    // Check if profiles table exists
    const { error: checkError } = await supabase.from("profiles").select("id").limit(1).single()

    // If we get a specific error about the relation not existing, create the tables
    if (checkError && checkError.message.includes('relation "public.profiles" does not exist')) {
      console.log("Initializing database schema...")

      // Create profiles table
      const { error: profilesError } = await supabase.rpc("create_profiles_table")

      if (profilesError && !profilesError.message.includes("already exists")) {
        // If RPC doesn't exist, create the table directly with SQL
        await supabase
          .rpc("execute_sql", {
            sql: `
            CREATE TABLE IF NOT EXISTS public.profiles (
              id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
              username TEXT UNIQUE NOT NULL,
              avatar_url TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
            );
            
            ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "Public profiles are viewable by everyone."
              ON public.profiles FOR SELECT
              USING (true);
              
            CREATE POLICY "Users can insert their own profile."
              ON public.profiles FOR INSERT
              WITH CHECK (auth.uid() = id);
              
            CREATE POLICY "Users can update their own profile."
              ON public.profiles FOR UPDATE
              USING (auth.uid() = id);
          `,
          })
          .catch((err) => {
            console.error("Error creating profiles table with SQL:", err)
          })
      }

      // Create posts table
      const { error: postsError } = await supabase.rpc("create_posts_table")

      if (postsError && !postsError.message.includes("already exists")) {
        await supabase
          .rpc("execute_sql", {
            sql: `
            CREATE TABLE IF NOT EXISTS public.posts (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
              content TEXT NOT NULL,
              image_url TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
            );
            
            ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
            
            CREATE POLICY "Public posts are viewable by everyone."
              ON public.posts FOR SELECT
              USING (true);
              
            CREATE POLICY "Users can insert their own posts."
              ON public.posts FOR INSERT
              WITH CHECK (auth.uid() = user_id);
              
            CREATE POLICY "Users can update their own posts."
              ON public.posts FOR UPDATE
              USING (auth.uid() = user_id);
              
            CREATE POLICY "Users can delete their own posts."
              ON public.posts FOR DELETE
              USING (auth.uid() = user_id);
          `,
          })
          .catch((err) => {
            console.error("Error creating posts table with SQL:", err)
          })
      }

      console.log("Database schema initialized successfully")
    }

    return { success: true }
  } catch (error) {
    console.error("Error initializing database:", error)
    return { success: false, error }
  }
}

