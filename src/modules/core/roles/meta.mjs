// Auto-generated module metadata for CORE.ROLES. Safe to regenerate.
export default {
  "code": "CORE.ROLES",
  "name": "Roles",
  "category": "core",
  "version": "1.0.0",
  "tables": [
    {
      "name": "roles",
      "fields": [
        {
          "name": "id",
          "type": "uuid",
          "options": []
        },
        {
          "name": "name",
          "type": "text",
          "options": []
        }
      ]
    }
  ],
  "pages": [
    {
      "route": "/roles",
      "title": "Roller",
      "table": "roles"
    }
  ],
  "menu": [
    {
      "label": "Roller",
      "route": "/roles",
      "icon": "shield",
      "parent": "Sistem"
    }
  ],
  "permissions": [
    "roles.view",
    "roles.manage"
  ],
  "api": [
    {
      "method": "GET",
      "path": "/api/roles"
    }
  ],
  "widgets": []
};
