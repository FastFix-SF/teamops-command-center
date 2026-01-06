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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_checkins: {
        Row: {
          ai_report: string | null
          ai_summary: string | null
          confidence: number | null
          created_at: string
          duration_seconds: number | null
          extracted_blockers: string | null
          extracted_next_steps: string | null
          extracted_progress: number | null
          id: string
          media_url: string | null
          member_id: string
          processed_at: string | null
          sentiment: Database["public"]["Enums"]["sentiment"] | null
          task_id: string | null
          thumbnail_url: string | null
          transcription: string | null
          type: Database["public"]["Enums"]["checkin_type"]
        }
        Insert: {
          ai_report?: string | null
          ai_summary?: string | null
          confidence?: number | null
          created_at?: string
          duration_seconds?: number | null
          extracted_blockers?: string | null
          extracted_next_steps?: string | null
          extracted_progress?: number | null
          id?: string
          media_url?: string | null
          member_id: string
          processed_at?: string | null
          sentiment?: Database["public"]["Enums"]["sentiment"] | null
          task_id?: string | null
          thumbnail_url?: string | null
          transcription?: string | null
          type: Database["public"]["Enums"]["checkin_type"]
        }
        Update: {
          ai_report?: string | null
          ai_summary?: string | null
          confidence?: number | null
          created_at?: string
          duration_seconds?: number | null
          extracted_blockers?: string | null
          extracted_next_steps?: string | null
          extracted_progress?: number | null
          id?: string
          media_url?: string | null
          member_id?: string
          processed_at?: string | null
          sentiment?: Database["public"]["Enums"]["sentiment"] | null
          task_id?: string | null
          thumbnail_url?: string | null
          transcription?: string | null
          type?: Database["public"]["Enums"]["checkin_type"]
        }
        Relationships: [
          {
            foreignKeyName: "ai_checkins_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_checkins_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      jarvis_conversations: {
        Row: {
          audio_url: string | null
          content: string
          created_at: string
          function_call: string | null
          function_result: string | null
          id: string
          member_id: string | null
          role: string
          session_id: string
        }
        Insert: {
          audio_url?: string | null
          content: string
          created_at?: string
          function_call?: string | null
          function_result?: string | null
          id?: string
          member_id?: string | null
          role: string
          session_id: string
        }
        Update: {
          audio_url?: string | null
          content?: string
          created_at?: string
          function_call?: string | null
          function_result?: string | null
          id?: string
          member_id?: string | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jarvis_conversations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_responses: {
        Row: {
          blockers: string | null
          confidence: number | null
          id: string
          meeting_id: string
          member_id: string
          next_actions: string | null
          progress_percent_update: number | null
          status_update: string | null
          submitted_at: string
          top_priority_task_id: string | null
          what_im_doing_now: string | null
        }
        Insert: {
          blockers?: string | null
          confidence?: number | null
          id?: string
          meeting_id: string
          member_id: string
          next_actions?: string | null
          progress_percent_update?: number | null
          status_update?: string | null
          submitted_at?: string
          top_priority_task_id?: string | null
          what_im_doing_now?: string | null
        }
        Update: {
          blockers?: string | null
          confidence?: number | null
          id?: string
          meeting_id?: string
          member_id?: string
          next_actions?: string | null
          progress_percent_update?: number | null
          status_update?: string | null
          submitted_at?: string
          top_priority_task_id?: string | null
          what_im_doing_now?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_responses_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_responses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_responses_top_priority_task_id_fkey"
            columns: ["top_priority_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string
          created_by_id: string
          end_time: string | null
          id: string
          notes_summary: string | null
          start_time: string
          status: Database["public"]["Enums"]["meeting_status"]
          title: string | null
          type: Database["public"]["Enums"]["meeting_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_id: string
          end_time?: string | null
          id?: string
          notes_summary?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string | null
          type: Database["public"]["Enums"]["meeting_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_id?: string
          end_time?: string | null
          id?: string
          notes_summary?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string | null
          type?: Database["public"]["Enums"]["meeting_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_created_by_id_fkey"
            columns: ["created_by_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          avatar_color: string | null
          avatar_url: string | null
          checkin_frequency: Database["public"]["Enums"]["checkin_frequency"]
          created_at: string
          email: string
          hourly_rate: number
          id: string
          is_active: boolean
          is_manager: boolean
          last_seen_at: string | null
          max_concurrent_tasks: number
          name: string
          notify_on_meeting: boolean
          notify_on_mention: boolean
          notify_on_overdue: boolean
          office_status: Database["public"]["Enums"]["member_status"]
          phone: string | null
          role: string
          seniority_level: number
          skill_tags: string | null
          status_message: string | null
          telegram_chat_id: string | null
          timezone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_color?: string | null
          avatar_url?: string | null
          checkin_frequency?: Database["public"]["Enums"]["checkin_frequency"]
          created_at?: string
          email: string
          hourly_rate?: number
          id?: string
          is_active?: boolean
          is_manager?: boolean
          last_seen_at?: string | null
          max_concurrent_tasks?: number
          name: string
          notify_on_meeting?: boolean
          notify_on_mention?: boolean
          notify_on_overdue?: boolean
          office_status?: Database["public"]["Enums"]["member_status"]
          phone?: string | null
          role?: string
          seniority_level?: number
          skill_tags?: string | null
          status_message?: string | null
          telegram_chat_id?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_color?: string | null
          avatar_url?: string | null
          checkin_frequency?: Database["public"]["Enums"]["checkin_frequency"]
          created_at?: string
          email?: string
          hourly_rate?: number
          id?: string
          is_active?: boolean
          is_manager?: boolean
          last_seen_at?: string | null
          max_concurrent_tasks?: number
          name?: string
          notify_on_meeting?: boolean
          notify_on_mention?: boolean
          notify_on_overdue?: boolean
          office_status?: Database["public"]["Enums"]["member_status"]
          phone?: string | null
          role?: string
          seniority_level?: number
          skill_tags?: string | null
          status_message?: string | null
          telegram_chat_id?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      monthly_reports: {
        Row: {
          billable_hours: number
          bonus_amount: number
          created_at: string
          delivery_score: number
          id: string
          improvement_score: number
          member_id: string
          month: string
          notes: string | null
          on_time_rate: number
          performance_score: number
          progress_score: number
          rank: number | null
          tasks_assigned: number
          tasks_completed: number
          total_hours: number
          updated_at: string
          value_generated: number
        }
        Insert: {
          billable_hours?: number
          bonus_amount?: number
          created_at?: string
          delivery_score?: number
          id?: string
          improvement_score?: number
          member_id: string
          month: string
          notes?: string | null
          on_time_rate?: number
          performance_score?: number
          progress_score?: number
          rank?: number | null
          tasks_assigned?: number
          tasks_completed?: number
          total_hours?: number
          updated_at?: string
          value_generated?: number
        }
        Update: {
          billable_hours?: number
          bonus_amount?: number
          created_at?: string
          delivery_score?: number
          id?: string
          improvement_score?: number
          member_id?: string
          month?: string
          notes?: string | null
          on_time_rate?: number
          performance_score?: number
          progress_score?: number
          rank?: number | null
          tasks_assigned?: number
          tasks_completed?: number
          total_hours?: number
          updated_at?: string
          value_generated?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          member_id: string
          message: string
          sent_at: string | null
          sent_by_id: string | null
          status: Database["public"]["Enums"]["notification_status"]
          subject: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          member_id: string
          message: string
          sent_at?: string | null
          sent_by_id?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          subject: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          member_id?: string
          message?: string
          sent_at?: string | null
          sent_by_id?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          subject?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sent_by_id_fkey"
            columns: ["sent_by_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          category: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          category?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          blocker_notes: string | null
          completed_at: string | null
          complexity_level: number
          created_at: string
          current_focus: boolean
          description: string | null
          due_date: string | null
          estimated_duration: Database["public"]["Enums"]["duration_estimate"]
          external_client_deadline: string | null
          flagged_immediate: boolean
          id: string
          importance_level: number
          internal_deadline: string | null
          last_checkin_at: string | null
          manager_notes: string | null
          owner_id: string
          pinned_by_manager: boolean
          priority: Database["public"]["Enums"]["task_priority"]
          progress_percent: number
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          urgency_level: number
        }
        Insert: {
          blocker_notes?: string | null
          completed_at?: string | null
          complexity_level?: number
          created_at?: string
          current_focus?: boolean
          description?: string | null
          due_date?: string | null
          estimated_duration?: Database["public"]["Enums"]["duration_estimate"]
          external_client_deadline?: string | null
          flagged_immediate?: boolean
          id?: string
          importance_level?: number
          internal_deadline?: string | null
          last_checkin_at?: string | null
          manager_notes?: string | null
          owner_id: string
          pinned_by_manager?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          progress_percent?: number
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          urgency_level?: number
        }
        Update: {
          blocker_notes?: string | null
          completed_at?: string | null
          complexity_level?: number
          created_at?: string
          current_focus?: boolean
          description?: string | null
          due_date?: string | null
          estimated_duration?: Database["public"]["Enums"]["duration_estimate"]
          external_client_deadline?: string | null
          flagged_immediate?: boolean
          id?: string
          importance_level?: number
          internal_deadline?: string | null
          last_checkin_at?: string | null
          manager_notes?: string | null
          owner_id?: string
          pinned_by_manager?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          progress_percent?: number
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          urgency_level?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          billable: boolean
          category: Database["public"]["Enums"]["time_category"]
          created_at: string
          date: string
          duration_minutes: number
          hourly_rate: number | null
          id: string
          member_id: string
          notes: string | null
          task_id: string | null
          updated_at: string
        }
        Insert: {
          billable?: boolean
          category?: Database["public"]["Enums"]["time_category"]
          created_at?: string
          date: string
          duration_minutes: number
          hourly_rate?: number | null
          id?: string
          member_id: string
          notes?: string | null
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          billable?: boolean
          category?: Database["public"]["Enums"]["time_category"]
          created_at?: string
          date?: string
          duration_minutes?: number
          hourly_rate?: number | null
          id?: string
          member_id?: string
          notes?: string | null
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "member"
      checkin_frequency: "HOURLY" | "DAILY" | "WEEKLY"
      checkin_type: "VOICE" | "VIDEO" | "TEXT"
      duration_estimate: "XS" | "S" | "M" | "L" | "XL"
      meeting_status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED"
      meeting_type: "DAILY_STANDUP" | "WEEKLY_PLANNING" | "MONTHLY_REVIEW"
      member_status: "ONLINE" | "AWAY" | "BUSY" | "IN_MEETING" | "OFFLINE"
      notification_channel: "TELEGRAM" | "EMAIL" | "IN_APP"
      notification_status: "PENDING" | "SENT" | "FAILED"
      notification_type:
        | "OVERDUE_ALERT"
        | "MEETING_REMINDER"
        | "PROGRESS_UPDATE"
        | "ACHIEVEMENT"
        | "LEADERBOARD"
      sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE"
      task_priority: "P0" | "P1" | "P2" | "P3"
      task_status: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "DONE"
      time_category: "CLIENT_WORK" | "INTERNAL" | "SALES" | "R_AND_D" | "ADMIN"
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
      app_role: ["admin", "manager", "member"],
      checkin_frequency: ["HOURLY", "DAILY", "WEEKLY"],
      checkin_type: ["VOICE", "VIDEO", "TEXT"],
      duration_estimate: ["XS", "S", "M", "L", "XL"],
      meeting_status: ["SCHEDULED", "IN_PROGRESS", "COMPLETED"],
      meeting_type: ["DAILY_STANDUP", "WEEKLY_PLANNING", "MONTHLY_REVIEW"],
      member_status: ["ONLINE", "AWAY", "BUSY", "IN_MEETING", "OFFLINE"],
      notification_channel: ["TELEGRAM", "EMAIL", "IN_APP"],
      notification_status: ["PENDING", "SENT", "FAILED"],
      notification_type: [
        "OVERDUE_ALERT",
        "MEETING_REMINDER",
        "PROGRESS_UPDATE",
        "ACHIEVEMENT",
        "LEADERBOARD",
      ],
      sentiment: ["POSITIVE", "NEUTRAL", "NEGATIVE"],
      task_priority: ["P0", "P1", "P2", "P3"],
      task_status: ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"],
      time_category: ["CLIENT_WORK", "INTERNAL", "SALES", "R_AND_D", "ADMIN"],
    },
  },
} as const
