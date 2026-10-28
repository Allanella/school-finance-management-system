export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type TableShape<Row, Insert, Update = Partial<Insert>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

type Timestamped = { created_at: string }

type SchoolRow = Timestamped & {
  id: string
  name: string
  school_type: string
  country_code: string
  currency_code: string
  created_by: string | null
}

type MembershipRow = Timestamped & {
  school_id: string
  user_id: string
  role: string
}

type EducationLevelRow = Timestamped & {
  id: string
  school_id: string
  name: string
  stage: string
  sequence_index: number
  is_active: boolean
}

type AcademicYearRow = Timestamped & {
  id: string
  school_id: string
  name: string
  starts_on: string
  ends_on: string
  is_current: boolean
}

type SchoolTermRow = Timestamped & {
  id: string
  school_id: string
  academic_year_id: string
  name: string
  starts_on: string
  ends_on: string
}

type ClassRow = Timestamped & {
  id: string
  school_id: string
  education_level_id: string
  academic_year_id: string | null
  stream_name: string
}

type StudentRow = Timestamped & {
  id: string
  school_id: string
  class_id: string | null
  admission_number: string
  first_name: string
  last_name: string
  student_type: string
  status: string
  guardian_name: string | null
  guardian_phone: string | null
  admitted_on: string
}

type InvoiceRow = Timestamped & {
  id: string
  school_id: string
  student_id: string
  academic_year_id: string | null
  term_id: string | null
  fee_structure_id: string | null
  invoice_number: string
  description: string
  line_items: Json
  amount_due_ugx: number
  due_on: string | null
  status: string
  created_by: string | null
}

type FeeStructureRow = Timestamped & {
  id: string
  school_id: string
  education_level_id: string
  name: string
  student_type: string
  is_active: boolean
  created_by: string | null
}

type FeeStructureItemRow = Timestamped & {
  id: string
  school_id: string
  fee_structure_id: string
  name: string
  amount_ugx: number
  sort_order: number
}

type ExpenseRequisitionRow = Timestamped & {
  id: string
  school_id: string
  requested_by: string | null
  reviewed_by: string | null
  vendor: string
  category: string
  items: Json
  amount_ugx: number
  status: string
  notes: string | null
  reviewed_at: string | null
}

type PaymentRow = Timestamped & {
  id: string
  school_id: string
  student_id: string
  invoice_id: string | null
  amount_ugx: number
  method: string
  reference_number: string | null
  idempotency_key: string
  recorded_by: string | null
  received_at: string
}

type ExpenseRow = Timestamped & {
  id: string
  school_id: string
  category: string
  description: string
  amount_ugx: number
  incurred_on: string
  recorded_by: string | null
}

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' }
  public: {
    Tables: {
      schools: TableShape<
        SchoolRow,
        Omit<SchoolRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
      >
      school_memberships: TableShape<
        MembershipRow,
        Omit<MembershipRow, 'created_at'> & { created_at?: string }
      >
      education_levels: TableShape<
        EducationLevelRow,
        Omit<EducationLevelRow, 'id' | 'created_at' | 'stage' | 'sequence_index' | 'is_active'> & {
          id?: string
          created_at?: string
          stage?: string
          sequence_index?: number
          is_active?: boolean
        }
      >
      academic_years: TableShape<
        AcademicYearRow,
        Omit<AcademicYearRow, 'id' | 'created_at' | 'is_current'> & {
          id?: string
          created_at?: string
          is_current?: boolean
        }
      >
      school_terms: TableShape<
        SchoolTermRow,
        Omit<SchoolTermRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
      >
      classes: TableShape<
        ClassRow,
        Omit<ClassRow, 'id' | 'created_at' | 'academic_year_id' | 'stream_name'> & {
          id?: string
          created_at?: string
          academic_year_id?: string | null
          stream_name?: string
        }
      >
      students: TableShape<
        StudentRow,
        Omit<StudentRow, 'id' | 'created_at' | 'class_id' | 'student_type' | 'status' | 'guardian_name' | 'guardian_phone' | 'admitted_on'> & {
          id?: string
          created_at?: string
          class_id?: string | null
          student_type?: string
          status?: string
          guardian_name?: string | null
          guardian_phone?: string | null
          admitted_on?: string
        }
      >
      fee_invoices: TableShape<
        InvoiceRow,
        Omit<InvoiceRow, 'id' | 'created_at' | 'academic_year_id' | 'term_id' | 'fee_structure_id' | 'line_items' | 'due_on' | 'status' | 'created_by'> & {
          id?: string
          created_at?: string
          academic_year_id?: string | null
          term_id?: string | null
          fee_structure_id?: string | null
          line_items?: Json
          due_on?: string | null
          status?: string
          created_by?: string | null
        }
      >
      fee_structures: TableShape<
        FeeStructureRow,
        Omit<FeeStructureRow, 'id' | 'created_at' | 'student_type' | 'is_active' | 'created_by'> & {
          id?: string
          created_at?: string
          student_type?: string
          is_active?: boolean
          created_by?: string | null
        }
      >
      fee_structure_items: TableShape<
        FeeStructureItemRow,
        Omit<FeeStructureItemRow, 'id' | 'created_at' | 'sort_order'> & {
          id?: string
          created_at?: string
          sort_order?: number
        }
      >
      expense_requisitions: TableShape<
        ExpenseRequisitionRow,
        Omit<ExpenseRequisitionRow, 'id' | 'created_at' | 'requested_by' | 'reviewed_by' | 'items' | 'status' | 'notes' | 'reviewed_at'> & {
          id?: string
          created_at?: string
          requested_by?: string | null
          reviewed_by?: string | null
          items?: Json
          status?: string
          notes?: string | null
          reviewed_at?: string | null
        }
      >
      payments: TableShape<
        PaymentRow,
        Omit<PaymentRow, 'id' | 'created_at' | 'invoice_id' | 'reference_number' | 'idempotency_key' | 'recorded_by' | 'received_at'> & {
          id?: string
          created_at?: string
          invoice_id?: string | null
          reference_number?: string | null
          idempotency_key?: string
          recorded_by?: string | null
          received_at?: string
        }
      >
      expenses: TableShape<
        ExpenseRow,
        Omit<ExpenseRow, 'id' | 'created_at' | 'incurred_on' | 'recorded_by'> & {
          id?: string
          created_at?: string
          incurred_on?: string
          recorded_by?: string | null
        }
      >
    }
    Views: { [_ in never]: never }
    Functions: {
      get_school_finance_summary: {
        Args: { target_school_id: string }
        Returns: { collections_ugx: number; expenses_ugx: number; outstanding_ugx: number }[]
      }
      is_school_member: {
        Args: { target_school_id: string; allowed_roles?: string[] }
        Returns: boolean
      }
      record_school_payment: {
        Args: {
          target_school_id: string
          target_student_id: string
          amount_ugx: number
          payment_method: string
          reference?: string | null
          target_invoice_id?: string | null
          request_key?: string | null
        }
        Returns: string
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<Name extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][Name]['Row']
export type TablesInsert<Name extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][Name]['Insert']
export type TablesUpdate<Name extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][Name]['Update']
