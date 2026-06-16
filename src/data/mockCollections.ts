import { ApiRequest, SidebarNode, KeyValueParam } from '../types';

// Helper to generate unique IDs
const genId = () => Math.random().toString(36).substring(2, 9);

// Default headers exactly matching the screenshot
export const defaultHeaders = (): KeyValueParam[] => [
  { id: genId(), key: 'Postman-Token', value: '<calculated when request is sent>', description: 'Unique token generated for the request', enabled: true },
  { id: genId(), key: 'Host', value: '<calculated when request is sent>', description: 'The server host', enabled: true },
  { id: genId(), key: 'User-Agent', value: 'PostmanRuntime/7.49.1', description: 'Agent string', enabled: true },
  { id: genId(), key: 'Accept', value: '*/*', description: 'Media formats acceptable', enabled: true },
  { id: genId(), key: 'Accept-Encoding', value: 'gzip, deflate, br', description: 'Supported compression algorithms', enabled: true },
  { id: genId(), key: 'Connection', value: 'keep-alive', description: 'Keep connection active', enabled: true }
];

export const mockRequestsList: ApiRequest[] = [
  // Assignments folder requests
  {
    id: 'req_assignment_analytics',
    name: 'Get assignment analytics',
    method: 'GET',
    url: '{{base_url}}/assignment/analytics',
    path: ['LMS', 'Teacher', 'Assignments'],
    params: [
      { id: genId(), key: 'period', value: 'semester_1', description: 'Filter statistics by period', enabled: true },
      { id: genId(), key: 'include_grades', value: 'true', description: 'Determine if individual grades should be merged', enabled: true }
    ],
    headers: defaultHeaders(),
    bodyType: 'none',
    response: {
      statusCode: 200,
      statusText: 'OK',
      timeMs: 245,
      sizeBytes: 1542,
      isError: false,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Date': new Date().toUTCString(),
        'Server': 'gunicorn/19.9.0',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        summary: {
          total_assignments: 42,
          completed_by_majority: 38,
          average_grade_percentage: 84.6,
          highest_grade: 100,
          lowest_grade: 45
        },
        distribution: {
          A: 12,
          B: 15,
          C: 6,
          D: 3,
          F: 2
        },
        recent_activity: [
          { student_name: "Rustam Aliev", action: "submitted", score: null, time: "2 hours ago" },
          { student_name: "Bekzod Nematov", action: "graded", score: 95, time: "4 hours ago" }
        ]
      }, null, 2)
    }
  },
  {
    id: 'req_assignment_list',
    name: 'Get assignment list',
    method: 'GET',
    url: '{{base_url}}/assignment',
    path: ['LMS', 'Teacher', 'Assignments'],
    params: [
      { id: genId(), key: 'limit', value: '20', description: 'Limit results pagination', enabled: true },
      { id: genId(), key: 'status', value: 'active', description: 'Filter by published status', enabled: true }
    ],
    headers: defaultHeaders(),
    bodyType: 'none',
    response: {
      statusCode: 200,
      statusText: 'OK',
      timeMs: 112,
      sizeBytes: 854,
      isError: false,
      headers: {
        'Content-Type': 'application/json',
        'Date': new Date().toUTCString()
      },
      body: JSON.stringify([
        { id: 10, title: "Historical Analysis: The Silk Road Influence", subject: "World History", due_date: "2026-06-30" },
        { id: 11, title: "Lab: Chemical Kinetic Rates", subject: "Inorganic Chemistry", due_date: "2026-07-05" },
        { id: 12, title: "Introduction to Matrices", subject: "Linear Algebra", due_date: "2026-07-12" }
      ], null, 2)
    }
  },
  {
    id: 'req_assign_by_id',
    name: 'Get assign by id',
    method: 'GET',
    url: '{{base_url}}/assignment/10',
    path: ['LMS', 'Teacher', 'Assignments'],
    params: [],
    headers: [
      ...defaultHeaders(),
      { id: genId(), key: 'Cache-Control', value: 'no-cache', description: 'Ignore cache', enabled: false }
    ],
    bodyType: 'none',
    response: {
      statusCode: 200,
      statusText: 'OK',
      timeMs: 148,
      sizeBytes: 1332,
      isError: false,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Date': new Date().toUTCString(),
        'Server': 'nginx/1.18.0',
        'X-Powered-By': 'Express',
        'Connection': 'keep-alive',
        'ETag': 'W/"534-188b4ee437b"'
      },
      body: JSON.stringify({
        id: 10,
        title: "Historical Analysis: The Silk Road Influence",
        subject: "World History",
        teacher: {
          id: 402,
          name: "Sarah Connor",
          email: "sconnor@lms-academy.org"
        },
        max_score: 100,
        allow_late_submissions: false,
        due_date: "2026-06-30T23:59:00Z",
        description: "Analyze the socioeconomic and cultural exchange along the Silk Road between 200 BCE and 1400 CE. Focus on two specific items of trade (such as silk, paper, horses, glass, or spices) and trace how their trade altered domestic structures.",
        instructions: [
          "Write a minimum of 1500 words in standard academic prose",
          "Must cite at least four academic, peer-reviewed sources",
          "Format in Chicago Turabian footnoting style",
          "Submit PDF format via the student workspace portal"
        ],
        grading_rubric: {
          historical_accuracy: "30%",
          analytical_depth: "40%",
          academic_citations: "15%",
          formatting_structure: "15%"
        },
        students_assigned: 34,
        status: "published_active"
      }, null, 2)
    }
  },
  {
    id: 'req_update_assign',
    name: 'Update assign',
    method: 'PUT',
    url: '{{base_url}}/assignment/10',
    path: ['LMS', 'Teacher', 'Assignments'],
    params: [],
    headers: [
      ...defaultHeaders(),
      { id: genId(), key: 'Content-Type', value: 'application/json', description: '', enabled: true }
    ],
    bodyType: 'json',
    bodyRaw: JSON.stringify({
      title: "Historical Analysis: The Silk Road Trade Networks (Updated)",
      max_score: 120,
      allow_late_submissions: true
    }, null, 2),
    response: {
      statusCode: 200,
      statusText: 'OK',
      timeMs: 198,
      sizeBytes: 412,
      isError: false,
      headers: {
        'Content-Type': 'application/json',
        'Date': new Date().toUTCString()
      },
      body: JSON.stringify({
        success: true,
        message: "Assignment 10 successfully updated",
        updatedAt: new Date().toISOString(),
        fieldsChanged: ["title", "max_score", "allow_late_submissions"]
      }, null, 2)
    }
  },
  {
    id: 'req_get_subjects_list',
    name: 'Get subjects list',
    method: 'GET',
    url: '{{base_url}}/subject',
    path: ['LMS', 'Teacher', 'Assignments'],
    params: [],
    headers: defaultHeaders(),
    bodyType: 'none',
    response: {
      statusCode: 200,
      statusText: 'OK',
      timeMs: 95,
      sizeBytes: 520,
      isError: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { code: "HIST-101", name: "World History", credits: 4 },
        { code: "CHEM-205", name: "Inorganic Chemistry", credits: 3 },
        { code: "MATH-310", name: "Linear Algebra", credits: 4 }
      ], null, 2)
    }
  },
  {
    id: 'req_get_group_list',
    name: 'Get group list',
    method: 'GET',
    url: '{{base_url}}/groups',
    path: ['LMS', 'Teacher', 'Assignments'],
    params: [],
    headers: defaultHeaders(),
    bodyType: 'none',
    response: {
      statusCode: 200,
      statusText: 'OK',
      timeMs: 140,
      sizeBytes: 450,
      isError: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groups: [
          { id: "g_hist_a", name: "History - Group A", count: 18 },
          { id: "g_hist_b", name: "History - Group B", count: 16 }
        ]
      }, null, 2)
    }
  },
  {
    id: 'req_delete_assignment',
    name: 'Delete assignment',
    method: 'DELETE',
    url: '{{base_url}}/assignment/10',
    path: ['LMS', 'Teacher', 'Assignments'],
    params: [],
    headers: defaultHeaders(),
    bodyType: 'none',
    response: {
      statusCode: 200,
      statusText: 'OK',
      timeMs: 182,
      sizeBytes: 211,
      isError: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        deletedId: 10,
        message: "Assignment deleted from LMS active list."
      }, null, 2)
    }
  },

  // Schedule folder requests
  {
    id: 'req_get_schedule_groups',
    name: 'Get schedule groups',
    method: 'GET',
    url: '{{base_url}}/schedule/groups',
    path: ['LMS', 'Teacher', 'Schedule'],
    params: [],
    headers: defaultHeaders(),
    bodyType: 'none',
    response: {
      statusCode: 200,
      statusText: 'OK',
      timeMs: 120,
      sizeBytes: 310,
      isError: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        academic_year: "2026",
        semester: "Spring",
        groups: ["A-Primary", "B-Secondary", "C-NightShift"]
      }, null, 2)
    }
  },
  {
    id: 'req_get_schedule_weekly',
    name: 'Get schedule weekly by gro...',
    method: 'GET',
    url: '{{base_url}}/schedule/weekly',
    path: ['LMS', 'Teacher', 'Schedule'],
    params: [{ id: genId(), key: 'groupId', value: 'A-Primary', description: 'Group lookup ID', enabled: true }],
    headers: defaultHeaders(),
    bodyType: 'none',
    response: {
      statusCode: 200,
      statusText: 'OK',
      timeMs: 160,
      sizeBytes: 812,
      isError: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: "A-Primary",
        schedule: {
          Monday: [
            { time: "09:00 - 10:30", course: "World History", room: "302-A" },
            { time: "11:00 - 12:30", course: "Linear Algebra", room: "105-B" }
          ],
          Wednesday: [
            { time: "09:00 - 10:30", course: "World History", room: "302-A" }
          ],
          Friday: [
            { time: "13:00 - 14:30", course: "Inorganic Chemistry", room: "Lab 2" }
          ]
        }
      }, null, 2)
    }
  },

  // Root level / high-level mock items
  {
    id: 'req_new_request',
    name: 'New Request',
    method: 'POST',
    url: '{{base_url}}/mock/submit',
    path: ['LMS'],
    params: [],
    headers: defaultHeaders(),
    bodyType: 'json',
    bodyRaw: '{\n  "name": "Quick Endpoint Test",\n  "active": true\n}',
    response: null
  },
  {
    id: 'req_a',
    name: 'a',
    method: 'GET',
    url: 'https://api.github.com/users/octocat',
    path: ['LMS'],
    params: [],
    headers: defaultHeaders(),
    bodyType: 'none',
    response: {
      statusCode: 200,
      statusText: 'OK',
      timeMs: 382,
      sizeBytes: 1100,
      isError: false,
      headers: {
        'Content-Type': 'application/json',
        'Server': 'GitHub.com'
      },
      body: JSON.stringify({
        login: "octocat",
        id: 5832347,
        avatar_url: "https://avatars.githubusercontent.com/u/5832347?v=4",
        type: "User",
        name: "The Octocat",
        company: "@github",
        blog: "https://github.blog",
        location: "San Francisco",
        public_repos: 8,
        followers: 3920
      }, null, 2)
    }
  }
];

export const sidebarTreeData: SidebarNode[] = [
  {
    id: 'folder_blue_comply',
    name: 'Blue Comply',
    type: 'folder',
    isOpen: false,
    children: []
  },
  {
    id: 'folder_hrm_system',
    name: 'HRM SYSTEM',
    type: 'folder',
    isOpen: false,
    children: []
  },
  {
    id: 'folder_lms',
    name: 'LMS',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'folder_lms_admin',
        name: 'admin',
        type: 'folder',
        isOpen: false,
        children: []
      },
      {
        id: 'folder_lms_teacher',
        name: 'Teacher',
        type: 'folder',
        isOpen: true,
        children: [
          {
            id: 'folder_teacher_subjects',
            name: 'Subjects',
            type: 'folder',
            isOpen: false,
            children: []
          },
          {
            id: 'folder_teacher_students',
            name: 'Students',
            type: 'folder',
            isOpen: false,
            children: []
          },
          {
            id: 'folder_teacher_assignments',
            name: 'Assignments',
            type: 'folder',
            isOpen: true,
            children: [
              { id: 'item_req_assignment_analytics', requestId: 'req_assignment_analytics', name: 'Get assignment analytics', type: 'request', method: 'GET' },
              { id: 'item_req_assignment_list', requestId: 'req_assignment_list', name: 'Get assignment list', type: 'request', method: 'GET' },
              { id: 'item_req_assign_by_id', requestId: 'req_assign_by_id', name: 'Get assign by id', type: 'request', method: 'GET' },
              { id: 'item_req_update_assign', requestId: 'req_update_assign', name: 'Update assign', type: 'request', method: 'PUT' },
              { id: 'item_req_get_subjects_list', requestId: 'req_get_subjects_list', name: 'Get subjects list', type: 'request', method: 'GET' },
              { id: 'item_req_get_group_list', requestId: 'req_get_group_list', name: 'Get group list', type: 'request', method: 'GET' },
              { id: 'item_req_delete_assignment', requestId: 'req_delete_assignment', name: 'Delete assignment', type: 'request', method: 'DELETE' }
            ]
          },
          {
            id: 'folder_teacher_grades',
            name: 'Grades',
            type: 'folder',
            isOpen: false,
            children: []
          },
          {
            id: 'folder_teacher_schedule',
            name: 'Schedule',
            type: 'folder',
            isOpen: true,
            children: [
              { id: 'item_req_get_schedule_groups', requestId: 'req_get_schedule_groups', name: 'Get schedule groups', type: 'request', method: 'GET' },
              { id: 'item_req_get_schedule_weekly', requestId: 'req_get_schedule_weekly', name: 'Get schedule weekly by gro...', type: 'request', method: 'GET' }
            ]
          },
          { id: 'folder_teacher_events', name: 'Events', type: 'folder', isOpen: false, children: [] },
          { id: 'folder_teacher_annoyncements', name: 'Announcements', type: 'folder', isOpen: false, children: [] },
          { id: 'folder_teacher_dashboard', name: 'Dashboard', type: 'folder', isOpen: false, children: [] },
          { id: 'folder_teacher_group_attendance', name: 'group attendance', type: 'folder', isOpen: false, children: [] },
          { id: 'folder_teacher_attendance', name: 'Attendance', type: 'folder', isOpen: false, children: [] }
        ]
      },
      { id: 'folder_lms_auth', name: 'Auth', type: 'folder', isOpen: false, children: [] },
      { id: 'folder_lms_student', name: 'Student', type: 'folder', isOpen: false, children: [] },
      { id: 'item_req_new_request', requestId: 'req_new_request', name: 'New Request', type: 'request', method: 'POST' },
      { id: 'item_req_a', requestId: 'req_a', name: 'a', type: 'request', method: 'GET' }
    ]
  }
];
