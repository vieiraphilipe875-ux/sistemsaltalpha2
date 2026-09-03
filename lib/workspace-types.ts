export type Member = {
  id: string;
  email: string;
  name: string;
  role: "manager" | "admin" | "social" | "designer" | "copywriter" | "video_editor" | "collaborator" | "client";
  agencyOwnerId: string | null;
  clientAccessMode: "all" | "selected";
  status: "pending" | "active" | "inactive";
  createdAt: string;
};

export type Client = {
  id: string;
  name: string;
  handle: string;
  driveUrl: string;
  avatarKey: string | null;
  bannerKey: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  accent: string;
  status: "prospecting" | "active" | "inactive";
  contactName: string;
  phone: string;
  email: string;
  revenue: number;
  dueDay: number;
  notes: string;
  createdAt: string;
};

export type Board = {
  id: string;
  clientId: string;
  title: string;
  period: string;
  status: "draft" | "active" | "completed";
  createdBy: string;
  createdAt: string;
};

export type Slide = {
  id: string;
  deliverableId: string;
  position: number;
  copy: string;
  direction: string;
};

export type Asset = {
  id: string;
  deliverableId: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  version: number;
  uploadedBy: string;
  createdAt: string;
  url: string;
};

export type Attachment = {
  id: string;
  deliverableId: string;
  slidePosition: number | null;
  storageKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
  url: string;
};

export type Annotation = {
  id: string;
  assetId: string;
  slideNumber: number;
  x: number;
  y: number;
  comment: string;
  authorId: string;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
};

export type Deliverable = {
  id: string;
  boardId: string;
  title: string;
  kind: "carousel" | "reels" | "stories" | "static";
  slideCount: number;
  status: "briefing" | "production" | "review" | "changes" | "approved";
  assigneeId: string | null;
  dueAt: string;
  notes: string;
  sourceUrl: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  slides: Slide[];
  assets: Asset[];
  attachments: Attachment[];
  references: DeliverableReference[];
};

export type DeliverableReference = {
  id: string;
  deliverableId: string;
  url: string;
  description: string;
  createdAt: string;
};

export type WorkspaceData = {
  currentMember: Member;
  members: Member[];
  clients: Client[];
  clientMembers: { clientId: string; memberId: string }[];
  memberPermissions: { memberId: string; permission: string }[];
  boards: Board[];
  deliverables: Deliverable[];
  annotations: Annotation[];
  transactions: Transaction[];
  financeWorkers: FinanceWorker[];
  workerCompetencies: WorkerCompetency[];
  financialDocuments: FinancialDocument[];
  crmLeads: CrmLead[];
  crmDeals: CrmDeal[];
  crmActivities: CrmActivity[];
};

export type CrmLead = {
  id: string; agencyOwnerId: string; company: string; contactName: string; email: string; phone: string; source: string;
  status: "new" | "research" | "contacting" | "connected" | "qualifying" | "sql" | "nurture" | "disqualified";
  score: number; potentialValue: number; nextAction: string; nextActionAt: string | null; notes: string; ownerId: string | null; createdAt: string; updatedAt: string;
};

export type CrmDeal = {
  id: string; agencyOwnerId: string; leadId: string | null; company: string; contactName: string; value: number;
  stage: "discovery" | "solution" | "proposal" | "negotiation" | "decision" | "contract" | "won" | "lost";
  probability: number; nextAction: string; nextActionAt: string | null; closeDate: string | null; ownerId: string | null; notes: string; lossReason: string | null; createdAt: string; updatedAt: string;
};

export type CrmActivity = {
  id: string; agencyOwnerId: string; leadId: string | null; dealId: string | null;
  type: "call" | "whatsapp" | "email" | "meeting" | "task" | "note"; title: string; dueAt: string | null; status: "pending" | "done"; notes: string; createdBy: string; createdAt: string;
};

export type Transaction = {
  id: string;
  agencyOwnerId: string | null;
  type: "income" | "expense" | "transfer" | "contribution" | "withdrawal" | "reimbursement" | "reversal" | "fee" | "tax" | "adjustment";
  amount: number;
  paidAmount: number;
  category: string;
  costCenter: string;
  account: string;
  status: "predicted" | "open" | "partial" | "paid" | "overdue" | "cancelled";
  competence: string;
  dueDate: string;
  paymentDate: string | null;
  clientId: string | null;
  counterpart: string;
  paymentMethod: string;
  recurring: boolean;
  recurrence: string;
  description: string;
  notes: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type FinanceWorker = {
  id: string; agencyOwnerId: string; name: string;
  employmentType: "clt" | "pj" | "partner" | "intern" | "freelancer" | "other";
  status: "active" | "away" | "inactive"; taxId: string; companyName: string; role: string; costCenter: string;
  email: string; phone: string; monthlyAmount: number; paymentDay: number; paymentMethod: string; paymentDetails: string;
  invoiceRequired: boolean; contractEnd: string | null; notes: string; createdAt: string; updatedAt: string;
};

export type WorkerCompetency = {
  id: string; agencyOwnerId: string; workerId: string; competence: string; expectedAmount: number; adjustments: number; dueDate: string;
  status: "predicted" | "waiting_document" | "approved" | "paid" | "overdue";
  invoiceStatus: "not_required" | "waiting" | "received" | "validated" | "divergent";
  paymentDate: string | null; notes: string; createdAt: string; updatedAt: string;
};

export type FinancialDocument = {
  id: string; agencyOwnerId: string; transactionId: string | null; workerCompetencyId: string | null;
  type: "invoice" | "receipt" | "bill" | "contract" | "statement" | "other"; competence: string;
  storageKey: string; fileName: string; mimeType: string; fileSize: number; uploadedBy: string; createdAt: string; url: string;
};
