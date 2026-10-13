// Auto-generated module metadata for CORE.USERS. Safe to regenerate.
export default {
  "code": "CORE.USERS",
  "name": "Users",
  "category": "core",
  "version": "1.0.0",
  "tables": [
    {
      "name": "users",
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "options": []
        },
        {
          "name": "email",
          "type": "text",
          "options": []
        },
        {
          "name": "name",
          "type": "text",
          "options": []
        },
        {
          "name": "active",
          "type": "boolean",
          "options": []
        }
      ]
    }
  ],
  "pages": [
    {
      "route": "/users",
      "title": "Kullanıcılar",
      "table": "users"
    }
  ],
  "menu": [
    {
      "label": "Kullanıcılar",
      "route": "/users",
      "icon": "users",
      "parent": "Sistem"
    }
  ],
  "permissions": [
    "users.view",
    "users.manage"
  ],
  "api": [
    {
      "method": "GET",
      "path": "/api/users"
    },
    {
      "method": "POST",
      "path": "/api/users"
    }
  ],
  "widgets": []
};
