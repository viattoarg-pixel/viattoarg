
-- 1. Drop old bug-tracker tables (CASCADE removes dependent policies/FKs)
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.attachments CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.bugs CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.invitations CASCADE;
DROP TABLE IF EXISTS public.company_settings CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;

DROP FUNCTION IF EXISTS public.generate_tracking_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_team_members() CASCADE;
DROP SEQUENCE IF EXISTS public.bug_tracking_seq;

-- 2. Budgets
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  max_amount NUMERIC(14,2) NOT NULL CHECK (max_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'ARS',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT ALL ON public.budgets TO service_role;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own budgets" ON public.budgets
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER budgets_updated_at BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_budgets_user ON public.budgets(user_id);

-- 3. Expense categories
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Tag',
  color TEXT NOT NULL DEFAULT 'hsl(var(--primary))',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own categories" ON public.expense_categories
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_categories_user ON public.expense_categories(user_id);

-- 4. Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL DEFAULT '',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own expenses" ON public.expenses
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_expenses_user ON public.expenses(user_id);
CREATE INDEX idx_expenses_budget ON public.expenses(budget_id);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date DESC);

-- 5. Update handle_new_user to seed default categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  INSERT INTO public.expense_categories (user_id, name, icon, color) VALUES
    (NEW.id, 'Comida',      'Utensils', 'hsl(25 95% 53%)'),
    (NEW.id, 'Transporte',  'Car',      'hsl(217 91% 60%)'),
    (NEW.id, 'Alojamiento', 'BedDouble','hsl(280 80% 60%)'),
    (NEW.id, 'Combustible', 'Fuel',     'hsl(0 84% 60%)'),
    (NEW.id, 'Otros',       'Tag',      'hsl(160 60% 45%)');
  RETURN NEW;
END;
$$;

-- 6. Seed categories for existing users that don't have any yet
INSERT INTO public.expense_categories (user_id, name, icon, color)
SELECT p.user_id, c.name, c.icon, c.color
FROM public.profiles p
CROSS JOIN (VALUES
  ('Comida',      'Utensils', 'hsl(25 95% 53%)'),
  ('Transporte',  'Car',      'hsl(217 91% 60%)'),
  ('Alojamiento', 'BedDouble','hsl(280 80% 60%)'),
  ('Combustible', 'Fuel',     'hsl(0 84% 60%)'),
  ('Otros',       'Tag',      'hsl(160 60% 45%)')
) AS c(name, icon, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec WHERE ec.user_id = p.user_id
);
