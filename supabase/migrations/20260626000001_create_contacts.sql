-- 무료 상담 신청 폼 제출 내용
CREATE TABLE contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  industry    TEXT,
  message     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 최신 신청순 조회를 위한 인덱스
CREATE INDEX idx_contacts_created_at ON contacts (created_at DESC);

-- Row Level Security 활성화
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 서버(service_role)만 읽기/쓰기 가능, 클라이언트 직접 접근 차단
CREATE POLICY "service_role only" ON contacts
  USING (auth.role() = 'service_role');
