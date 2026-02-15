export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      bill_items: {
        Row: {
          amount: number
          bill_id: string
          created_at: string
          delivery_city: string
          id: string
          is_extra_fee: boolean
          item: string
          order_number: string
          quantity: number
          rate: number
        }
        Insert: {
          amount?: number
          bill_id: string
          created_at?: string
          delivery_city?: string
          id?: string
          is_extra_fee?: boolean
          item: string
          order_number: string
          quantity: number
          rate?: number
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string
          delivery_city?: string
          id?: string
          is_extra_fee?: boolean
          item?: string
          order_number?: string
          quantity?: number
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          bill_date: string
          bill_number: number
          bill_to: string
          created_at: string
          created_by: string | null
          driver_name: string | null
          id: string
          order_numbers: string[]
          total_amount: number
          total_quantity: number
          vehicle_number: string | null
        }
        Insert: {
          bill_date?: string
          bill_number: number
          bill_to: string
          created_at?: string
          created_by?: string | null
          driver_name?: string | null
          id?: string
          order_numbers: string[]
          total_amount?: number
          total_quantity?: number
          vehicle_number?: string | null
        }
        Update: {
          bill_date?: string
          bill_number?: number
          bill_to?: string
          created_at?: string
          created_by?: string | null
          driver_name?: string | null
          id?: string
          order_numbers?: string[]
          total_amount?: number
          total_quantity?: number
          vehicle_number?: string | null
        }
        Relationships: []
      }
      daily_analytics: {
        Row: {
          completed_orders: number | null
          created_at: string
          date: string
          id: string
          pending_orders: number | null
          total_orders: number | null
          total_revenue: number | null
        }
        Insert: {
          completed_orders?: number | null
          created_at?: string
          date: string
          id?: string
          pending_orders?: number | null
          total_orders?: number | null
          total_revenue?: number | null
        }
        Update: {
          completed_orders?: number | null
          created_at?: string
          date?: string
          id?: string
          pending_orders?: number | null
          total_orders?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      monthly_analytics: {
        Row: {
          avg_order_value: number | null
          created_at: string
          id: string
          month: string
          total_orders: number | null
          total_revenue: number | null
        }
        Insert: {
          avg_order_value?: number | null
          created_at?: string
          id?: string
          month: string
          total_orders?: number | null
          total_revenue?: number | null
        }
        Update: {
          avg_order_value?: number | null
          created_at?: string
          id?: string
          month?: string
          total_orders?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      order_tables: {
        Row: {
          colour: string
          created_at: string | null
          frame_colour: string | null
          front_panel_length: number | null
          front_panel_size: string | null
          id: string
          l_shape_orientation: string | null
          leg_height: string | null
          leg_shape: string | null
          leg_size: string | null
          order_id: string | null
          price: number
          quantity: number
          size: string
          top_colour: string | null
          wire_holes: string | null
          wire_holes_comment: string | null
        }
        Insert: {
          colour: string
          created_at?: string | null
          frame_colour?: string | null
          front_panel_length?: number | null
          front_panel_size?: string | null
          id?: string
          l_shape_orientation?: string | null
          leg_height?: string | null
          leg_shape?: string | null
          leg_size?: string | null
          order_id?: string | null
          price: number
          quantity: number
          size: string
          top_colour?: string | null
          wire_holes?: string | null
          wire_holes_comment?: string | null
        }
        Update: {
          colour?: string
          created_at?: string | null
          frame_colour?: string | null
          front_panel_length?: number | null
          front_panel_size?: string | null
          id?: string
          l_shape_orientation?: string | null
          leg_height?: string | null
          leg_shape?: string | null
          leg_size?: string | null
          order_id?: string | null
          price?: number
          quantity?: number
          size?: string
          top_colour?: string | null
          wire_holes?: string | null
          wire_holes_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_tables_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          additional_charges: number | null
          address: string
          colour: string
          completed_at: string | null
          contact_number: string
          created_at: string | null
          created_by: string | null
          customer_district: string | null
          customer_name: string
          delivery_date: string | null
          delivery_fee: number | null
          delivery_person_id: string | null
          delivery_status: string | null
          delivery_type: string | null
          id: string
          note: string | null
          order_form_number: string | null
          price: number
          quantity: number
          sales_person_name: string | null
          status: string | null
          table_size: string
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          additional_charges?: number | null
          address: string
          colour: string
          completed_at?: string | null
          contact_number: string
          created_at?: string | null
          created_by?: string | null
          customer_district?: string | null
          customer_name: string
          delivery_date?: string | null
          delivery_fee?: number | null
          delivery_person_id?: string | null
          delivery_status?: string | null
          delivery_type?: string | null
          id?: string
          note?: string | null
          order_form_number?: string | null
          price: number
          quantity: number
          sales_person_name?: string | null
          status?: string | null
          table_size: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          additional_charges?: number | null
          address?: string
          colour?: string
          completed_at?: string | null
          contact_number?: string
          created_at?: string | null
          created_by?: string | null
          customer_district?: string | null
          customer_name?: string
          delivery_date?: string | null
          delivery_fee?: number | null
          delivery_person_id?: string | null
          delivery_status?: string | null
          delivery_type?: string | null
          id?: string
          note?: string | null
          order_form_number?: string | null
          price?: number
          quantity?: number
          sales_person_name?: string | null
          status?: string | null
          table_size?: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      production_bars: {
        Row: {
          color: string
          created_at: string
          id: string
          quantity: number
          size: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          quantity?: number
          size: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          quantity?: number
          size?: string
          updated_at?: string
        }
        Relationships: []
      }
      production_legs: {
        Row: {
          color: string
          created_at: string
          id: string
          quantity: number
          size: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          quantity?: number
          size: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          quantity?: number
          size?: string
          updated_at?: string
        }
        Relationships: []
      }
      production_table_tops: {
        Row: {
          color: string
          created_at: string
          id: string
          quantity: number
          size: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          quantity?: number
          size: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          quantity?: number
          size?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          contact_no: string | null
          created_at: string | null
          id: string
          name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          contact_no?: string | null
          created_at?: string | null
          id: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          contact_no?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription?: Json
          user_id?: string
        }
        Relationships: []
      }
      super_admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          session_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          session_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          session_token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "super_admin_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "super_admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_login: string | null
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      transport: {
        Row: {
          id: string
          loaded_at: string
          loaded_by: string | null
          order_id: string
          transport_mode: string
        }
        Insert: {
          id?: string
          loaded_at?: string
          loaded_by?: string | null
          order_id: string
          transport_mode: string
        }
        Update: {
          id?: string
          loaded_at?: string
          loaded_by?: string | null
          order_id?: string
          transport_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: { Args: never; Returns: string }
      super_admin_get_session: {
        Args: { p_session_token: string }
        Returns: {
          email: string
          expires_at: string
          is_active: boolean
          last_login: string
          session_id: string
          session_token: string
          user_id: string
          username: string
        }[]
      }
      super_admin_sign_in: {
        Args: { p_password: string; p_username: string }
        Returns: {
          created_at: string
          email: string
          id: string
          username: string
        }[]
      }
      super_admin_sign_out: {
        Args: { p_session_token: string }
        Returns: undefined
      }
      update_daily_analytics: { Args: never; Returns: undefined }
    }
    Enums: {
      user_role: "customer" | "seller" | "delivery" | "admin" | "manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["customer", "seller", "delivery", "admin", "manager"],
    },
  },
} as const
