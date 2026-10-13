// Auto-generated module metadata for CORE.AUTH. Safe to regenerate.
export default {
  "code": "CORE.AUTH",
  "name": "Authentication",
  "category": "core",
  "version": "1.0.0",
  "tables": [
    {
      "name": "auth_session",
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "options": []
        },
        {
          "name": "user_id",
          "type": "uuid",
          "options": []
        },
        {
          "name": "token",
          "type": "text",
          "options": []
        },
        {
          "name": "expires_at",
          "type": "datetime",
          "options": []
        }
      ]
    }
  ],
  "pages": [
    {
      "route": "/login",
      "title": "Giriş",
      "table": "auth_session"
    }
  ],
  "menu": [],
  "permissions": [
    "auth.login"
  ],
  "api": [
    {
      "method": "POST",
      "path": "/api/auth/login"
    },
    {
      "method": "POST",
      "path": "/api/auth/logout"
    }
  ],
  "widgets": []
};
