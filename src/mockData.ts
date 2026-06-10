import type { 
  ProductItem, 
  PlanItem, 
  StudentProject, 
  AMASession, 
  StudentMeeting, 
  AdminCall, 
  ContentItem, 
  DailyIssue, 
  FeatureAdoption 
} from './types';

export const initialProductItems: ProductItem[] = [
  {
    id: 'prod-1',
    feature: 'AI Session Notes',
    description: 'Automatically generate summaries, action items, and student performance metrics from recorded Zoom cohort sessions using LLMs.',
    tarunSirApproval: false,
    raisedByTarunSir: true,
    priority: 'P0',
    poc: 'Akash',
    status: 'On Hold',
    clickupStatus: 'testing',
    taskLink: 'https://app.clickup.com/t/866y2rtm1',
    blocker: '',
    deadline: '',
    notes: 'https://www.figma.com/file/ai-notes-concept',
    product: 'Coach LMS Web',
    uiux: '',
    finalRelease: '',
    productDeadline: ''
  },
  {
    id: 'prod-2',
    feature: 'Design Demo Flow - Concept',
    description: 'Design premium walkthrough mockups for new operations leads showing class configurations, TA rosters, and scheduling dashboards.',
    tarunSirApproval: false,
    raisedByTarunSir: false,
    priority: 'P0',
    poc: 'Anushka',
    status: 'In Progress',
    clickupStatus: '',
    taskLink: 'https://drive.google.com/drive/folders/1bA7y',
    blocker: '',
    deadline: '',
    notes: 'Manager, TA, Teacher, Lead personas mockups completed',
    product: 'Coach LMS Web',
    uiux: '31 Mar 2026',
    finalRelease: '',
    productDeadline: ''
  },
  {
    id: 'prod-3',
    feature: 'Concerns SOP',
    description: 'Standard operating procedure for resolving and escalating student support concerns across program managers.',
    tarunSirApproval: false,
    raisedByTarunSir: false,
    priority: 'P0',
    poc: 'Akash',
    status: 'Ongoing',
    clickupStatus: '',
    taskLink: '',
    blocker: '',
    deadline: '',
    notes: 'SOP draft shared on email for approval',
    product: 'Coach LMS App',
    uiux: '',
    finalRelease: '',
    productDeadline: ''
  },
  {
    id: 'prod-4',
    feature: 'AMA Session Issues Plan (Resolving Top 5 features)',
    description: 'Action plan to address top student complaints from last AMA, specifically attendance logging lag and dashboard login redirects.',
    tarunSirApproval: false,
    raisedByTarunSir: false,
    priority: 'P0',
    poc: 'Nikhil',
    status: 'In Progress',
    clickupStatus: '',
    taskLink: '',
    blocker: '',
    deadline: '',
    notes: 'Focusing on attendance QR latency and login redirects',
    product: 'Coach LMS Web',
    uiux: '26 Mar 2026',
    finalRelease: '',
    productDeadline: ''
  },
  {
    id: 'prod-5',
    feature: 'L2 & L3 Messages for WhatsApp',
    description: 'Integrate WhatsApp template triggers for automatic notifications when L2/L3 support escalations are updated.',
    tarunSirApproval: false,
    raisedByTarunSir: false,
    priority: 'P0',
    poc: 'Akash',
    status: 'In Progress',
    clickupStatus: '',
    taskLink: 'https://app.clickup.com/t/866y2rtk5',
    blocker: '',
    deadline: '',
    notes: 'Integrating WhatsApp API templates',
    product: 'Coach LMS Web',
    uiux: '18 Feb 2026',
    finalRelease: '',
    productDeadline: ''
  },
  {
    id: 'prod-6',
    feature: 'Concern Mail to Admins - UG, PGP',
    description: 'Weekly automated email summary containing high-severity student issues sent directly to UG and PGP admin teams.',
    tarunSirApproval: false,
    raisedByTarunSir: false,
    priority: 'P0',
    poc: 'Nikhil',
    status: 'Ongoing',
    clickupStatus: '',
    taskLink: '',
    blocker: '',
    deadline: '',
    notes: 'Started from 23 Feb (Weekly automated trigger)',
    product: 'Admin Portal',
    uiux: '',
    finalRelease: '',
    productDeadline: ''
  },
  {
    id: 'prod-7',
    feature: 'Content Management to Nikhil',
    description: 'Complete handoff documentation, admin permissions, and tools walkthrough for content upload tasks to Nikhil.',
    tarunSirApproval: false,
    raisedByTarunSir: false,
    priority: 'P0',
    poc: 'Nikhil',
    status: 'In Progress',
    clickupStatus: '',
    taskLink: '',
    blocker: '',
    deadline: '',
    notes: 'Handoff meeting scheduled on Monday',
    product: 'Coach LMS Web',
    uiux: '26 Mar 2026',
    finalRelease: '',
    productDeadline: ''
  },
  {
    id: 'prod-8',
    feature: 'Email Template Analyze',
    description: 'Review formatting and email deliverability stats across automated email templates to improve open rates.',
    tarunSirApproval: false,
    raisedByTarunSir: false,
    priority: 'P0',
    poc: 'Nikhil',
    status: 'In Progress',
    clickupStatus: '',
    taskLink: '',
    blocker: '',
    deadline: '',
    notes: 'First Report 26 Feb - Filters testing active',
    product: 'Coach LMS Web',
    uiux: '',
    finalRelease: '',
    productDeadline: ''
  },
  {
    id: 'prod-9',
    feature: 'Concerns for Admins',
    description: 'Expose admin portal screens allowing cohort leads to categorize, comment, and resolve support requests.',
    tarunSirApproval: false,
    raisedByTarunSir: false,
    priority: 'P2',
    poc: 'Akash',
    status: 'In Progress',
    clickupStatus: 'testing',
    taskLink: 'https://app.clickup.com/t/866y2rtg9',
    blocker: '',
    deadline: '',
    notes: 'Ready for production push next sprint',
    product: 'Admin Portal',
    uiux: '',
    finalRelease: '',
    productDeadline: ''
  },
  {
    id: 'prod-10',
    feature: 'Check all emails copies and designs',
    description: 'Audit email copies and layout files from the marketing team for visual styling and copywriting consistency.',
    tarunSirApproval: false,
    raisedByTarunSir: false,
    priority: 'P0',
    poc: 'Nikhil',
    status: 'Ongoing',
    clickupStatus: '',
    taskLink: '',
    blocker: '',
    deadline: '',
    notes: 'Pending feedback from marketing team',
    product: 'Coach LMS Web',
    uiux: '',
    finalRelease: '',
    productDeadline: ''
  },
  {
    id: 'prod-11',
    feature: 'Discontinued Programs Concerns Data',
    description: 'Compile historical concern logs and refund requests for discontinued academic cohorts to assist operations review.',
    tarunSirApproval: false,
    raisedByTarunSir: false,
    priority: 'P0',
    poc: 'Akash',
    status: 'In Progress',
    clickupStatus: '',
    taskLink: '',
    blocker: '',
    deadline: '',
    notes: 'Gaurav will be the POC from Operations',
    product: 'Coach LMS App',
    uiux: '',
    finalRelease: '',
    productDeadline: ''
  },
  {
    id: 'prod-12',
    feature: 'Multiple Popup UX',
    description: 'Build a centralized modal window queue manager to prevent multiple dashboard popup alerts from overlapping.',
    tarunSirApproval: true,
    raisedByTarunSir: false,
    priority: 'P0',
    poc: 'Akash',
    status: 'In Progress',
    clickupStatus: 'Closed',
    taskLink: 'https://app.clickup.com/t/866y2rte3',
    blocker: '',
    deadline: '12 Jun 2026',
    notes: 'Implement a centralized modal manager to avoid overlays',
    product: 'Coach LMS Web',
    uiux: '',
    finalRelease: '',
    productDeadline: ''
  },
  {
    id: 'prod-13',
    feature: 'Mobile Parent App for LMS',
    description: 'Design specifications and API contracts for parent portal access to view student grades and class attendance reports.',
    tarunSirApproval: true,
    raisedByTarunSir: true,
    priority: 'P0',
    poc: 'Akash',
    status: 'In Progress',
    clickupStatus: 'tested',
    taskLink: 'https://app.clickup.com/t/866y2cta2',
    blocker: '',
    deadline: '27 May 2026',
    notes: 'https://coach-parent-mockup.figma',
    product: 'Coach LMS App',
    uiux: '',
    finalRelease: '',
    productDeadline: ''
  },
  {
    id: 'prod-14',
    feature: 'Concerns raised from different pages (Attendance, Assignment)',
    description: 'Refactor context panels to allow users to trigger a support concern directly from any student action page.',
    tarunSirApproval: true,
    raisedByTarunSir: false,
    priority: 'P0',
    poc: 'Anushka',
    status: 'In Progress',
    clickupStatus: 'tested',
    taskLink: 'https://app.clickup.com/t/866y2rtb7',
    blocker: '',
    deadline: '',
    notes: 'Refactoring layout files',
    product: 'Coach LMS Web',
    uiux: '26 Mar 2026',
    finalRelease: '',
    productDeadline: ''
  },
  {
    id: 'prod-15',
    feature: 'Career Coach UIUX',
    description: 'Revamp career dashboard UI/UX mockups including resume builders, resume feedback status indicators, and mockup mock-interview calendars.',
    tarunSirApproval: true,
    raisedByTarunSir: false,
    priority: 'P0',
    poc: 'Akash',
    status: 'In Progress',
    clickupStatus: 'development',
    taskLink: 'https://app.clickup.com/t/866y2rtc4',
    blocker: '',
    deadline: '',
    notes: 'Awaiting design approvals for student resume dashboard',
    product: 'Coach LMS Web',
    uiux: '',
    finalRelease: '',
    productDeadline: ''
  }
];

export const initialPlanItems: PlanItem[] = [
  // May Development
  {
    id: 'plan-1',
    month: 'May 2026',
    category: 'Development',
    task: 'Student Course Overview: Add a new section "Recent Activity"',
    link: 'https://app.clickup.com/t/866y2rt01',
    status: 'testing'
  },
  {
    id: 'plan-2',
    month: 'May 2026',
    category: 'Development',
    task: 'Student Month View Calendar & Reminders',
    link: 'https://app.clickup.com/t/866y2rt02',
    status: 'testing'
  },
  {
    id: 'plan-3',
    month: 'May 2026',
    category: 'Development',
    task: 'Ask to Resubmit Flow - 1. Database migrations & backend APIs',
    link: 'https://app.clickup.com/t/866y2rt03',
    status: 'development'
  },
  {
    id: 'plan-4',
    month: 'May 2026',
    category: 'Development',
    task: 'Concerns raised from different pages (Attendance, Assignments)',
    link: 'https://app.clickup.com/t/866y2rt04',
    status: 'open'
  },
  {
    id: 'plan-5',
    month: 'May 2026',
    category: 'Development',
    task: 'Initial Onboarding UI wizard for new students',
    link: 'https://app.clickup.com/t/866y2rt05',
    status: 'open'
  },
  {
    id: 'plan-6',
    month: 'May 2026',
    category: 'Development',
    task: 'PRS UIUX changes and API updates',
    link: 'https://app.clickup.com/t/866y2rt06',
    status: 'tested'
  },
  // May UIUX
  {
    id: 'plan-7',
    month: 'May 2026',
    category: 'UI/UX',
    task: 'Market Place of the Apps Content & Design System',
    link: 'https://app.clickup.com/t/866y2rt20',
    status: 'development'
  },
  {
    id: 'plan-8',
    month: 'May 2026',
    category: 'UI/UX',
    task: 'Absent Remarks workflow UI details',
    link: 'https://app.clickup.com/t/866y2rt21',
    status: 'closed'
  },
  {
    id: 'plan-9',
    month: 'May 2026',
    category: 'UI/UX',
    task: 'Improve Bulk Upload (Pre-Read, In-class, Quizzes)',
    link: 'https://app.clickup.com/t/866y2rt22',
    status: 'closed'
  },
  {
    id: 'plan-10',
    month: 'May 2026',
    category: 'UI/UX',
    task: 'Coach LMS | Concerns | POCs assigning panel UI',
    link: 'https://app.clickup.com/t/866y2rt23',
    status: 'testing'
  },
  // May Product
  {
    id: 'plan-11',
    month: 'May 2026',
    category: 'Product',
    task: 'Easy Video Upload Way & Compressor integration',
    link: '',
    status: 'Done'
  },
  {
    id: 'plan-12',
    month: 'May 2026',
    category: 'Product',
    task: 'Admin Support / Feature Request template standardizer',
    link: 'https://app.clickup.com/t/866y2rt41',
    status: 'development'
  },
  {
    id: 'plan-13',
    month: 'May 2026',
    category: 'Product',
    task: 'Admin Know How Buttons on dashboard',
    link: '',
    status: 'open'
  }
];

export const initialStudentProjects: StudentProject[] = [
  {
    id: 'proj-1',
    title: 'Matmaking App',
    description: 'A matchmaking app that helps people connect through mutual likes, compatibility matching, chat, and interactive games.',
    thingsWeBuild: 'Matching algorithm, Compatibility percentage, User Profile, Messages, Games and Settings',
    status: 'Delivered',
    assigned: '25 Sep 2025',
    blocker: '',
    completeInfoDate: '20 October 2025',
    priority: 'P2',
    poc: 'Akash',
    clickupStatus: 'closed',
    taskLink: '',
    productDeadline: '10 October 2025',
    uiux: '15 Sep 2025',
    deadline: '25 Sep 2025',
    finalRelease: '20 October 2025',
    raisedByTarunSir: false,
    tarunSirApproval: true,
    product: 'Student Portal'
  },
  {
    id: 'proj-2',
    title: 'Dandelian',
    description: 'Dandelion is an AI-powered, accessibility-first learning chatbot that supports students with learning disabilities while enabling parents to track and guide their progress.',
    thingsWeBuild: 'Build from scratch, UI themes, Accessibility features, Assessment Questions, AI Chatbot, Progress Tracker, Garden for Engagement, Personalized Learning, Parent Portal, Writing Practice, Maths Practice',
    status: 'Cancelled',
    assigned: '17 Feb 2026',
    blocker: 'Marketing approval delayed',
    completeInfoDate: '1 Mar 2026',
    priority: 'P1',
    poc: 'Anushka',
    clickupStatus: 'closed',
    taskLink: '',
    productDeadline: '20 Feb 2026',
    uiux: '25 Feb 2026',
    deadline: '28 Feb 2026',
    finalRelease: '1 Mar 2026',
    raisedByTarunSir: true,
    tarunSirApproval: false,
    product: 'Student Portal'
  },
  {
    id: 'proj-3',
    title: 'ReflowAI',
    description: 'ReflowAI is a market intelligence platform that helps brands track competitors, monitor performance, and analyze real-time data across quick commerce platforms to make better business decisions.',
    thingsWeBuild: '1. Claude Connector/MCP, 2. Proxy/ Data Scraping Optimization, 3. Platform onboarding - Any 2',
    status: 'In-Progress',
    assigned: '30 March 2026',
    blocker: 'Proxy server proxy rotation limits',
    completeInfoDate: '14 April 2026',
    priority: 'P0',
    poc: 'Akash',
    clickupStatus: 'development',
    taskLink: 'https://app.clickup.com/t/reflow1',
    productDeadline: '05 April 2026',
    uiux: '08 April 2026',
    deadline: '12 April 2026',
    finalRelease: '14 April 2026',
    raisedByTarunSir: false,
    tarunSirApproval: false,
    product: 'Student Portal'
  }
];

export const initialAMASessions: AMASession[] = [
  {
    id: 'ama-1',
    date: '2026-06-12',
    topic: 'Generative AI & LLMs in Production',
    speaker: 'Siddharth (Lead Research Engineer)',
    cohort: 'UG-27,28,29',
    link: 'https://zoom.us/j/983756281',
    status: 'Scheduled'
  },
  {
    id: 'ama-2',
    date: '2026-06-18',
    topic: 'College Startups & Raising Pre-seed Capital',
    speaker: 'Varun (Co-founder, ReflowAI)',
    cohort: 'PGP TBM',
    link: 'https://zoom.us/j/847291039',
    status: 'Scheduled'
  },
  {
    id: 'ama-3',
    date: '2026-05-20',
    topic: 'Building Portfolio projects that stand out',
    speaker: 'Akash & Anushka',
    cohort: 'All Cohorts',
    link: 'https://zoom.us/rec/29472',
    status: 'Completed'
  }
];

export const initialStudentMeetings: StudentMeeting[] = [
  {
    id: 'meet-1',
    date: '9 Dec 2026',
    cohort: 'YLC 27',
    summary: '- System Stability: Frequent application crashes and performance failures occurring during peak usage periods (e.g. when users submit assignments).\n- Attendance Tracking: Lag in QR scan; sometimes marks students absent even after scanning QR successfully.\n- Communication Gaps: System push notifications are not firing.\n- Navigation Issues: Term filters are not working; clicking announcement plays first item instead of active item.\n- Data Latency: Academic grades are syncing slow from backend LMS.'
  },
  {
    id: 'meet-2',
    date: '10 Dec 2026',
    cohort: 'UG-27,28,29',
    summary: '- System Stability: Critical performance failures in assignment submissions, causing app crashes and extreme lag.\n- Access Barriers: Persistent login/auth errors preventing entry right before assignment deadlines.\n- Data Inconsistency: Student grades display inconsistently between web and mobile interfaces.\n- Module Malfunctions: MU.Ai is completely empty even after admin activation.'
  },
  {
    id: 'meet-3',
    date: '11 Dec 2025',
    cohort: 'PGP TBM',
    summary: '- Interface: Professional feedback page submit button is missing in responsive mobile view.\n- Redirection Errors: Push notifications and announcements direct users to random pages instead of target articles.\n- Career Coach: Navigation sidebar invisible in screen resolutions below 1080p.\n- Data Accessibility: Job application dates and detail cards are missing.'
  }
];

export const initialAdminCalls: AdminCall[] = [
  {
    id: 'adm-1',
    date: '2026-06-05',
    adminPoc: 'Shalini (Dean of Academics Office)',
    cohortTopic: 'Faculty Grade Book Rollout',
    discussion: 'Discussed low faculty adoption rates. Teachers find CSV bulk grading sheet upload complex and error-prone.',
    actions: 'Simplify instructions, release video tutorial, add validation warnings on CSV headers.',
    status: 'Pending Actions'
  },
  {
    id: 'adm-2',
    date: '2026-06-03',
    adminPoc: 'Rohan (Admissions Coordinator)',
    cohortTopic: 'CRM Sync Pipeline',
    discussion: 'Leads generated from onboarding forms fail to sync to Admin dashboard CRM within 5 minutes.',
    actions: 'Nikhil resolved API endpoint timeouts; syncing issues marked fixed.',
    status: 'Completed'
  }
];

export const initialContentItems: ContentItem[] = [
  {
    id: 'cont-1',
    module: 'Introduction to React & JSX',
    subject: 'Web Development',
    type: 'Video',
    poc: 'Nikhil',
    draftLink: 'https://drive.google.com/drive/folders/react-intro',
    status: 'Published',
    publishDate: '2026-04-15'
  },
  {
    id: 'cont-2',
    module: 'Relational Database Schema Design',
    subject: 'Backend Systems',
    type: 'Worksheet',
    poc: 'Anushka',
    draftLink: 'https://docs.google.com/document/d/schema-design',
    status: 'Under Review',
    publishDate: '2026-05-20'
  },
  {
    id: 'cont-3',
    module: 'System Design Interview Checklist',
    subject: 'Career Development',
    type: 'Notes',
    poc: 'Akash',
    draftLink: 'https://docs.google.com/document/d/system-design',
    status: 'Drafting',
    publishDate: ''
  }
];

export const initialDailyIssues: DailyIssue[] = [
  {
    id: '4',
    cohort: 'UG-DSAI-2029',
    product: 'Coach LMS Web',
    module: 'Timezone / Login/out',
    type: 'Bug/Defect',
    issues: '1. Remember me login session is not working\n2. Timezone change pop-up keeps showing on dashboard\n3. MU.AI bot widget not loading\n4. Case study module displays empty screen\n5. Clubs and events tab clicks do not trigger navigation',
    contact: 'Harsh Dhanuka (harsh.dhanuka_ugdsai2029@example.com)'
  },
  {
    id: '7',
    cohort: 'UG-DSAI-2029',
    product: 'Coach LMS Web',
    module: 'To-do list',
    type: 'Enhancement',
    issues: 'Students need ability to add personal customized checklist items in LMS To-Do widget.',
    contact: '-'
  },
  {
    id: '8',
    cohort: 'UG-DSAI-2029',
    product: 'Coach LMS APP',
    module: 'Courses',
    type: 'UX',
    issues: 'Course Card details need addition of Course Faculty Name, Attendance %, and completion progress indicators. Single Color default icons look generic.',
    contact: 'Jeet Marlecha (jeet.marlecha_ugdsai2029@example.com)'
  }
];

export const initialFeatureAdoptions: FeatureAdoption[] = [
  {
    id: 'adopt-1',
    feature: 'AI Session Notes',
    product: 'Coach LMS Web',
    launchDate: '2026-05-15',
    targetAudience: 'Students & Faculty',
    adoptionRate: 64,
    activeUsers: 450,
    sentiment: 4.2
  },
  {
    id: 'adopt-2',
    feature: 'Mobile Parent Portal',
    product: 'Coach LMS App',
    launchDate: '2026-05-28',
    targetAudience: 'Parents',
    adoptionRate: 35,
    activeUsers: 180,
    sentiment: 3.8
  },
  {
    id: 'adopt-3',
    feature: 'Career Coach Widget',
    product: 'Coach LMS Web',
    launchDate: '2026-06-01',
    targetAudience: 'UG Classes',
    adoptionRate: 88,
    activeUsers: 920,
    sentiment: 4.7
  },
  {
    id: 'adopt-4',
    feature: 'WhatsApp Bot L2 Alerts',
    product: 'Communication Engine',
    launchDate: '2026-02-18',
    targetAudience: 'All Cohorts',
    adoptionRate: 95,
    activeUsers: 1420,
    sentiment: 4.5
  }
];
