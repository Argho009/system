CREATE OR REPLACE FUNCTION exec_sql_query(sql_query text) 
RETURNS JSONB AS $$ 
DECLARE
  result JSONB;
BEGIN 
  EXECUTE 'SELECT json_agg(t) FROM (' || sql_query || ') t' INTO result;
  RETURN result;
END; 
$$ LANGUAGE plpgsql SECURITY DEFINER;
