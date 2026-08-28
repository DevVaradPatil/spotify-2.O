export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      artists: {
        Row: {
          id: number;
          name: string;
          slug: string;
          image_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          slug: string;
          image_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          slug?: string;
          image_path?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          stripe_customer_id: string | null;
        };
        Insert: {
          id: string;
          stripe_customer_id?: string | null;
        };
        Update: {
          id?: string;
          stripe_customer_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          user_id: string;
          artist_id: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          artist_id: number;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          artist_id?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follows_artist_id_fkey";
            columns: ["artist_id"];
            referencedRelation: "artists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      liked_songs: {
        Row: {
          created_at: string;
          song_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          song_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          song_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "liked_songs_song_id_fkey";
            columns: ["song_id"];
            referencedRelation: "songs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "liked_songs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: number;
          room_code: string;
          user_id: string | null;
          email: string | null;
          content: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          room_code: string;
          user_id?: string | null;
          email?: string | null;
          content: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          room_code?: string;
          user_id?: string | null;
          email?: string | null;
          content?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      play_events: {
        Row: {
          id: number;
          user_id: string;
          song_id: number;
          played_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          song_id: number;
          played_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          song_id?: number;
          played_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "play_events_song_id_fkey";
            columns: ["song_id"];
            referencedRelation: "songs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "play_events_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      playlist_songs: {
        Row: {
          playlist_id: number;
          song_id: number;
          position: number;
          added_at: string;
        };
        Insert: {
          playlist_id: number;
          song_id: number;
          position?: number;
          added_at?: string;
        };
        Update: {
          playlist_id?: number;
          song_id?: number;
          position?: number;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "playlist_songs_playlist_id_fkey";
            columns: ["playlist_id"];
            referencedRelation: "playlists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "playlist_songs_song_id_fkey";
            columns: ["song_id"];
            referencedRelation: "songs";
            referencedColumns: ["id"];
          },
        ];
      };
      playlists: {
        Row: {
          id: number;
          user_id: string;
          song_ids: number[];
          name: string;
          desc: string | null;
          image_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          song_ids?: number[];
          name: string;
          desc?: string | null;
          image_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          song_ids?: number[];
          name?: string;
          desc?: string | null;
          image_path?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "playlists_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      prices: {
        Row: {
          active: boolean | null;
          currency: string | null;
          description: string | null;
          id: string;
          interval: Database["public"]["Enums"]["pricing_plan_interval"] | null;
          interval_count: number | null;
          metadata: Json | null;
          product_id: string | null;
          trial_period_days: number | null;
          type: Database["public"]["Enums"]["pricing_type"] | null;
          unit_amount: number | null;
        };
        Insert: {
          active?: boolean | null;
          currency?: string | null;
          description?: string | null;
          id: string;
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null;
          interval_count?: number | null;
          metadata?: Json | null;
          product_id?: string | null;
          trial_period_days?: number | null;
          type?: Database["public"]["Enums"]["pricing_type"] | null;
          unit_amount?: number | null;
        };
        Update: {
          active?: boolean | null;
          currency?: string | null;
          description?: string | null;
          id?: string;
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null;
          interval_count?: number | null;
          metadata?: Json | null;
          product_id?: string | null;
          trial_period_days?: number | null;
          type?: Database["public"]["Enums"]["pricing_type"] | null;
          unit_amount?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          active: boolean | null;
          description: string | null;
          id: string;
          image: string | null;
          metadata: Json | null;
          name: string | null;
        };
        Insert: {
          active?: boolean | null;
          description?: string | null;
          id: string;
          image?: string | null;
          metadata?: Json | null;
          name?: string | null;
        };
        Update: {
          active?: boolean | null;
          description?: string | null;
          id?: string;
          image?: string | null;
          metadata?: Json | null;
          name?: string | null;
        };
        Relationships: [];
      };
      songs: {
        Row: {
          artist_id: number | null;
          author: string;
          created_at: string;
          id: number;
          image_path: string | null;
          song_path: string;
          title: string;
          user_id: string;
        };
        Insert: {
          artist_id?: number | null;
          author: string;
          created_at?: string;
          id?: number;
          image_path?: string | null;
          song_path: string;
          title: string;
          user_id: string;
        };
        Update: {
          artist_id?: number | null;
          author?: string;
          created_at?: string;
          id?: number;
          image_path?: string | null;
          song_path?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "songs_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          cancel_at: string | null;
          cancel_at_period_end: boolean | null;
          canceled_at: string | null;
          created: string;
          current_period_end: string;
          current_period_start: string;
          ended_at: string | null;
          id: string;
          metadata: Json | null;
          price_id: string | null;
          quantity: number | null;
          status: Database["public"]["Enums"]["subscription_status"] | null;
          trial_end: string | null;
          trial_start: string | null;
          user_id: string;
        };
        Insert: {
          cancel_at?: string | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: string | null;
          created?: string;
          current_period_end?: string;
          current_period_start?: string;
          ended_at?: string | null;
          id: string;
          metadata?: Json | null;
          price_id?: string | null;
          quantity?: number | null;
          status?: Database["public"]["Enums"]["subscription_status"] | null;
          trial_end?: string | null;
          trial_start?: string | null;
          user_id: string;
        };
        Update: {
          cancel_at?: string | null;
          cancel_at_period_end?: boolean | null;
          canceled_at?: string | null;
          created?: string;
          current_period_end?: string;
          current_period_start?: string;
          ended_at?: string | null;
          id?: string;
          metadata?: Json | null;
          price_id?: string | null;
          quantity?: number | null;
          status?: Database["public"]["Enums"]["subscription_status"] | null;
          trial_end?: string | null;
          trial_start?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_price_id_fkey";
            columns: ["price_id"];
            referencedRelation: "prices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          billing_address: Json | null;
          full_name: string | null;
          id: string;
          payment_method: Json | null;
        };
        Insert: {
          avatar_url?: string | null;
          billing_address?: Json | null;
          full_name?: string | null;
          id: string;
          payment_method?: Json | null;
        };
        Update: {
          avatar_url?: string | null;
          billing_address?: Json | null;
          full_name?: string | null;
          id?: string;
          payment_method?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "users_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      pricing_plan_interval: "day" | "week" | "month" | "year";
      pricing_type: "one_time" | "recurring";
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
        | "paused";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

/** Convenience aliases so app types can be derived instead of hand-maintained. */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
