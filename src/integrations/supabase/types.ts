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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      accounting_entries: {
        Row: {
          created_at: string
          expenses: number
          id: string
          month: string
          notes: string | null
          owner_id: string
          profit: number
          revenue: number
          roi: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          expenses?: number
          id?: string
          month: string
          notes?: string | null
          owner_id?: string
          profit?: number
          revenue?: number
          roi?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          expenses?: number
          id?: string
          month?: string
          notes?: string | null
          owner_id?: string
          profit?: number
          revenue?: number
          roi?: number
          updated_at?: string
        }
        Relationships: []
      }
      business: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string | null
          owner_id: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string | null
          owner_id: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string | null
          owner_id?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          business_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
        ]
      }
      hisab_nikash_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      hisab_nikash_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["hisab_nikash_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["hisab_nikash_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["hisab_nikash_role"]
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          customer_name: string
          facebook_group_links: string[] | null
          facebook_id: string | null
          id: string
          notes: string | null
          owner_id: string
          phone: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          facebook_group_links?: string[] | null
          facebook_id?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          phone: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          facebook_group_links?: string[] | null
          facebook_id?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          phone?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string
          product_image: string | null
          product_name: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price: number
          product_id: string
          product_image?: string | null
          product_name: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          product_image?: string | null
          product_name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          advance_payment: number
          business_id: string | null
          coupon_code: string | null
          created_at: string
          customer_address: string
          customer_area: string | null
          customer_email: string | null
          customer_name: string
          customer_note: string | null
          customer_phone: string
          delivery_fee: number
          discount: number
          due_payment: number
          id: string
          order_number: string | null
          owner_id: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          advance_payment?: number
          business_id?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_address: string
          customer_area?: string | null
          customer_email?: string | null
          customer_name: string
          customer_note?: string | null
          customer_phone: string
          delivery_fee?: number
          discount?: number
          due_payment?: number
          id?: string
          order_number?: string | null
          owner_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          advance_payment?: number
          business_id?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_address?: string
          customer_area?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_note?: string | null
          customer_phone?: string
          delivery_fee?: number
          discount?: number
          due_payment?: number
          id?: string
          order_number?: string | null
          owner_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          code: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          free_delivery_override: boolean
          gallery_images: string[] | null
          id: string
          image_url: string | null
          low_stock_threshold: number
          owner_id: string
          packages: Json
          price: number
          regular_price: number | null
          sort_order: number
          stock_quantity: number
          subcategory: string | null
          title: string
          top_rated: boolean
          updated_at: string
        }
        Insert: {
          category?: string | null
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          free_delivery_override?: boolean
          gallery_images?: string[] | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          owner_id?: string
          packages?: Json
          price?: number
          regular_price?: number | null
          sort_order?: number
          stock_quantity?: number
          subcategory?: string | null
          title: string
          top_rated?: boolean
          updated_at?: string
        }
        Update: {
          category?: string | null
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          free_delivery_override?: boolean
          gallery_images?: string[] | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          owner_id?: string
          packages?: Json
          price?: number
          regular_price?: number | null
          sort_order?: number
          stock_quantity?: number
          subcategory?: string | null
          title?: string
          top_rated?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          area: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          area?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          area?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          business_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          business_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          business_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_user: {
        Args: {
          _business_id: string
          _email: string
          _password: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      checkout_cart: {
        Args: { _order_id: string; _user_id: string }
        Returns: undefined
      }
      founder_login_as_shop_owner: {
        Args: { _business_id: string }
        Returns: {
          target_email: string
          temp_password: string
        }[]
      }
      get_moderator_scope_owner_id: { Args: never; Returns: string }
      get_original_admin_id: { Args: never; Returns: string }
      get_shop_team: {
        Args: { _business_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          phone: string
          role: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hisab_nikash_admin_list_users: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          display_name: string
          email: string
          id: string
          last_sign_in_at: string
          role: Database["public"]["Enums"]["hisab_nikash_role"]
        }[]
      }
      hisab_nikash_ensure_self: {
        Args: never
        Returns: Database["public"]["Enums"]["hisab_nikash_role"]
      }
      hisab_nikash_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["hisab_nikash_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "editor"
        | "founder"
        | "business_owner"
        | "shop_owner"
        | "customer"
      hisab_nikash_role: "admin" | "user" | "demo"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "editor",
        "founder",
        "business_owner",
        "shop_owner",
        "customer",
      ],
      hisab_nikash_role: ["admin", "user", "demo"],
    },
  },
} as const
