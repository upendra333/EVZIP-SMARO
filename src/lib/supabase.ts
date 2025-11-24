import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Create client even if env vars are missing (for development)
// This allows the app to render and show helpful error messages
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
)

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseAnonKey !== 'placeholder-key')

// Database types (to be expanded as needed)
export type Database = {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string
          type: 'subscription' | 'airport' | 'rental'
          ref_id: string
          created_at: string
          started_at: string | null
          ended_at: string | null
          cancel_reason: string | null
          otp: string | null
          status: string
        }
        Insert: Omit<Database['public']['Tables']['trips']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['trips']['Insert']>
      }
      subscription_rides: {
        Row: {
          id: string
          subscription_id: string
          date: string
          direction: string
          driver_id: string | null
          vehicle_id: string | null
          est_km: number | null
          actual_km: number | null
          fare: number | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['subscription_rides']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subscription_rides']['Insert']>
      }
      airport_bookings: {
        Row: {
          id: string
          customer_id: string
          flight_no: string | null
          pickup_at: string
          pickup: string
          drop: string
          est_km: number | null
          fare: number | null
          status: string
          driver_id: string | null
          vehicle_id: string | null
          notes: string | null
          hub_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['airport_bookings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['airport_bookings']['Insert']>
      }
      rental_bookings: {
        Row: {
          id: string
          customer_id: string
          package_hours: number
          package_km: number
          start_at: string
          end_at: string
          est_km: number | null
          extra_km_rate: number | null
          per_hour_rate: number | null
          fare: number | null
          status: string
          driver_id: string | null
          vehicle_id: string | null
          notes: string | null
          hub_id: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['rental_bookings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['rental_bookings']['Insert']>
      }
      drivers: {
        Row: {
          id: string
          name: string
          phone: string
          license_no: string | null
          status: string
          hub_id: string | null
          created_at: string
          updated_at: string
        }
      }
      vehicles: {
        Row: {
          id: string
          reg_no: string
          make: string | null
          model: string | null
          seats: number
          current_hub_id: string | null
          status: string
          created_at: string
          updated_at: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          phone: string | null
          email: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
      }
      hubs: {
        Row: {
          id: string
          name: string
          city: string | null
          lat: number | null
          lng: number | null
          created_at: string
          updated_at: string
        }
      }
      audit_log: {
        Row: {
          id: string
          actor_user_id: string | null
          actor_name: string | null
          object: string
          object_id: string
          action: string
          diff_json: Record<string, any>
          at: string
        }
      }
    }
    Functions: {
      today_metrics: {
        Args: {
          p_hub_id?: string | null
          p_date?: string | null
        }
        Returns: {
          active_trips: number
          due_next_60min: number
          delayed_trips: number
          on_time_percentage: number
          cancelled_no_show: number
          total_rides_today: number
          total_revenue_today: number
        }[]
      }
      daily_summary: {
        Args: {
          p_from_date: string
          p_to_date: string
          p_hub_id?: string | null
        }
        Returns: {
          report_date: string
          total_rides: number
          total_revenue: number
          subscription_count: number
          subscription_revenue: number
          airport_count: number
          airport_revenue: number
          rental_count: number
          rental_revenue: number
        }[]
      }
      weekly_summary: {
        Args: {
          p_from_date: string
          p_to_date: string
          p_hub_id?: string | null
        }
        Returns: {
          week_start: string
          week_end: string
          total_rides: number
          total_revenue: number
          subscription_count: number
          subscription_revenue: number
          airport_count: number
          airport_revenue: number
          rental_count: number
          rental_revenue: number
        }[]
      }
      advance_trip_status: {
        Args: {
          p_trip_id: string
          p_new_status: string
          p_actor_id?: string | null
          p_actor_name?: string | null
          p_cancel_reason?: string | null
        }
        Returns: {
          success: boolean
          error?: string
          trip_id?: string
          old_status?: string
          new_status?: string
        }
      }
      validate_manager_pin: {
        Args: {
          p_pin: string
        }
        Returns: boolean
      }
    }
  }
}

