import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaNeon } from "@prisma/adapter-neon"
import { generateCycles } from "../lib/dates/cycle-generator"

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

async function main() {
  const org = await db.organisation.findFirst()
  if (!org) {
    console.error("No organisation found — sign in first to create one via /onboarding")
    process.exit(1)
  }
  console.log(`Seeding for org: ${org.name} (${org.id})`)

  // ── Clean up previous seed data ───────────────────────────────────────────
  await db.subcontractOrder.deleteMany({ where: { organisationId: org.id, reference: { startsWith: "SEED-" } } })
  await db.project.deleteMany({ where: { organisationId: org.id, reference: { startsWith: "SEED-" } } })
  await db.subcontractor.deleteMany({ where: { organisationId: org.id, name: { startsWith: "[TEST]" } } })

  // ── Projects ──────────────────────────────────────────────────────────────
  const [project1, project2] = await Promise.all([
    db.project.create({
      data: {
        organisationId: org.id,
        name: "Highfield Gardens — Phase 2",
        reference: "SEED-PRJ-001",
        address: "Highfield Road, Birmingham B15 3QR",
        isActive: true,
      },
    }),
    db.project.create({
      data: {
        organisationId: org.id,
        name: "Elmwood Heights — Block B",
        reference: "SEED-PRJ-002",
        address: "Elmwood Lane, Solihull B91 2PH",
        isActive: true,
      },
    }),
  ])
  console.log("Created 2 projects")

  // ── Subcontractors ────────────────────────────────────────────────────────
  const [groundworks, steelwork, mep, cladding] = await Promise.all([
    db.subcontractor.create({
      data: {
        organisationId: org.id,
        name: "[TEST] Apex Groundworks Ltd",
        companyNumber: "12345678",
        contactEmails: ["contracts@apex-groundworks.co.uk"],
        cisStatus: "Verified",
      },
    }),
    db.subcontractor.create({
      data: {
        organisationId: org.id,
        name: "[TEST] Midland Steel Fabricators",
        companyNumber: "87654321",
        contactEmails: ["accounts@midlandsteel.co.uk"],
        cisStatus: "Gross",
      },
    }),
    db.subcontractor.create({
      data: {
        organisationId: org.id,
        name: "[TEST] Premier M&E Solutions",
        companyNumber: "11223344",
        contactEmails: ["finance@premiermep.co.uk"],
        cisStatus: "Verified",
      },
    }),
    db.subcontractor.create({
      data: {
        organisationId: org.id,
        name: "[TEST] Cladwell Cladding Systems",
        companyNumber: "55667788",
        contactEmails: ["billing@cladwell.co.uk"],
        cisStatus: "Gross",
      },
    }),
  ])
  console.log("Created 4 subcontractors")

  // ── Compliance documents ──────────────────────────────────────────────────
  await db.complianceDocument.createMany({
    data: [
      // Groundworks (all docs present, one expiring soon)
      { subcontractorId: groundworks.id, documentType: "Employers Liability", issueDate: new Date("2025-01-01"), expiryDate: new Date("2026-01-01"), status: "VALID" },
      { subcontractorId: groundworks.id, documentType: "Public Liability", issueDate: new Date("2025-01-01"), expiryDate: new Date("2026-01-01"), status: "VALID" },
      { subcontractorId: groundworks.id, documentType: "H&S Policy", issueDate: new Date("2025-06-01"), expiryDate: new Date("2026-07-22"), status: "EXPIRING_SOON" },
      { subcontractorId: groundworks.id, documentType: "CIS Confirmation", status: "VALID" },
      // Steelwork (one expired)
      { subcontractorId: steelwork.id, documentType: "Employers Liability", issueDate: new Date("2024-06-01"), expiryDate: new Date("2025-06-01"), status: "EXPIRED" },
      { subcontractorId: steelwork.id, documentType: "Public Liability", issueDate: new Date("2025-03-01"), expiryDate: new Date("2026-03-01"), status: "VALID" },
      // M&E (Employers Liability missing)
      { subcontractorId: mep.id, documentType: "Employers Liability", status: "MISSING" },
      { subcontractorId: mep.id, documentType: "Public Liability", issueDate: new Date("2025-01-01"), expiryDate: new Date("2026-01-01"), status: "VALID" },
      // Cladding (PI expiring soon — realistic for a specialist façade subcontractor)
      { subcontractorId: cladding.id, documentType: "Employers Liability", issueDate: new Date("2025-04-01"), expiryDate: new Date("2026-04-01"), status: "VALID" },
      { subcontractorId: cladding.id, documentType: "Public Liability", issueDate: new Date("2025-04-01"), expiryDate: new Date("2026-04-01"), status: "VALID" },
      { subcontractorId: cladding.id, documentType: "Professional Indemnity", issueDate: new Date("2025-04-01"), expiryDate: new Date("2026-07-28"), status: "EXPIRING_SOON" },
      { subcontractorId: cladding.id, documentType: "CHAS Accreditation", issueDate: new Date("2025-06-01"), expiryDate: new Date("2026-06-01"), status: "VALID" },
    ],
  })
  console.log("Created compliance documents")

  const today = new Date()
  const scheduleStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const scheduleEnd   = new Date(today.getFullYear() + 1, today.getMonth(), 0)

  // ── Subcontract orders ────────────────────────────────────────────────────

  const gw = await db.subcontractOrder.create({
    data: {
      organisationId: org.id,
      projectId: project1.id,
      subcontractorId: groundworks.id,
      reference: "SEED-SC-001",
      description: "Groundworks & foundations package",
      contractForm: "JCT_ICSUB",
      contractSum: 285000,
      retentionPct: 0.05,
      signatory: "Nick Socrates, Commercial Director",
      noticeRecipients: ["nick@columbia.co.uk"],
      inboundEmail: "app-seed01@in.noticeguard.app",
      paymentSchedule: {
        create: {
          appDueDateRule: "FIXED_DAY_OF_MONTH",
          appDueDayOfMonth: 25,
          dueDateOffsetDays: 7, dueDateOffsetType: "CALENDAR",
          paymentNoticeDeadlineDays: 5, paymentNoticeDeadlineType: "CALENDAR",
          finalDateOffsetDays: 21, finalDateOffsetType: "CALENDAR",
          payLessDeadlineDays: 7, payLessDeadlineType: "CALENDAR",
          scheduleStartDate: scheduleStart, scheduleEndDate: scheduleEnd,
        },
      },
      retentionLedger: { create: { totalHeld: 11250 } },
    },
    include: { paymentSchedule: true },
  })

  const sw = await db.subcontractOrder.create({
    data: {
      organisationId: org.id,
      projectId: project1.id,
      subcontractorId: steelwork.id,
      reference: "SEED-SC-002",
      description: "Structural steelwork",
      contractForm: "DOM1",
      contractSum: 420000,
      retentionPct: 0.05,
      signatory: "Chris Nash, QS",
      inboundEmail: "app-seed02@in.noticeguard.app",
      paymentSchedule: {
        create: {
          appDueDateRule: "FIXED_DAY_OF_MONTH",
          appDueDayOfMonth: 20,
          dueDateOffsetDays: 7, dueDateOffsetType: "CALENDAR",
          paymentNoticeDeadlineDays: 5, paymentNoticeDeadlineType: "CALENDAR",
          finalDateOffsetDays: 21, finalDateOffsetType: "CALENDAR",
          payLessDeadlineDays: 7, payLessDeadlineType: "CALENDAR",
          scheduleStartDate: scheduleStart, scheduleEndDate: scheduleEnd,
        },
      },
      retentionLedger: { create: { totalHeld: 18500 } },
    },
    include: { paymentSchedule: true },
  })

  const me = await db.subcontractOrder.create({
    data: {
      organisationId: org.id,
      projectId: project1.id,
      subcontractorId: mep.id,
      reference: "SEED-SC-003",
      description: "Mechanical & electrical package",
      contractForm: "SCHEME_DEFAULT",
      contractSum: 195000,
      retentionPct: 0.05,
      signatory: "Nick Socrates, Commercial Director",
      inboundEmail: "app-seed03@in.noticeguard.app",
      paymentSchedule: {
        create: {
          appDueDateRule: "FIXED_DAY_OF_MONTH",
          appDueDayOfMonth: 28,
          dueDateOffsetDays: 7, dueDateOffsetType: "CALENDAR",
          paymentNoticeDeadlineDays: 5, paymentNoticeDeadlineType: "CALENDAR",
          finalDateOffsetDays: 21, finalDateOffsetType: "CALENDAR",
          payLessDeadlineDays: 7, payLessDeadlineType: "CALENDAR",
          scheduleStartDate: scheduleStart, scheduleEndDate: scheduleEnd,
        },
      },
      retentionLedger: { create: { totalHeld: 7250 } },
    },
    include: { paymentSchedule: true },
  })

  // Cladding on project 2 — retention has a PC release date set
  const cl = await db.subcontractOrder.create({
    data: {
      organisationId: org.id,
      projectId: project2.id,
      subcontractorId: cladding.id,
      reference: "SEED-SC-004",
      description: "Façade & rainscreen cladding package",
      contractForm: "JCT_ICSUB",
      contractSum: 340000,
      retentionPct: 0.05,
      signatory: "Nick Socrates, Commercial Director",
      noticeRecipients: ["nick@columbia.co.uk"],
      inboundEmail: "app-seed04@in.noticeguard.app",
      paymentSchedule: {
        create: {
          appDueDateRule: "FIXED_DAY_OF_MONTH",
          appDueDayOfMonth: 15,
          dueDateOffsetDays: 7, dueDateOffsetType: "CALENDAR",
          paymentNoticeDeadlineDays: 5, paymentNoticeDeadlineType: "CALENDAR",
          finalDateOffsetDays: 21, finalDateOffsetType: "CALENDAR",
          payLessDeadlineDays: 7, payLessDeadlineType: "CALENDAR",
          scheduleStartDate: scheduleStart, scheduleEndDate: scheduleEnd,
        },
      },
      retentionLedger: {
        create: {
          totalHeld: 17500,
          // PC retention release expected ~8 months out
          pcReleaseDate: new Date(today.getFullYear(), today.getMonth() + 8, 15),
          pcReleaseAmount: 8500,
        },
      },
    },
    include: { paymentSchedule: true },
  })

  console.log("Created 4 subcontracts")

  // ── Activity schedule lines — complex hierarchical BOQs ───────────────────
  // indentLevel: 0 = section header (auto-sums children), 1 = item, 2 = sub-item
  // contractValue for parent rows is 0; the grid computes display values bottom-up

  // Groundworks BOQ  (total £285,000)
  await db.activityScheduleLine.createMany({
    data: [
      { subcontractOrderId: gw.id, sortOrder: 0,  indentLevel: 0, itemRef: "A",     description: "Preliminary Works",                                                contractValue: 0 },
      { subcontractOrderId: gw.id, sortOrder: 1,  indentLevel: 1, itemRef: "A.1",   description: "Site establishment, welfare & management",                         contractValue: 12000 },
      { subcontractOrderId: gw.id, sortOrder: 2,  indentLevel: 1, itemRef: "A.2",   description: "Temporary works & hoarding",                                        contractValue: 0 },
      { subcontractOrderId: gw.id, sortOrder: 3,  indentLevel: 2, itemRef: "A.2.1", description: "Hoarding & security fencing",                                       contractValue: 8000 },
      { subcontractOrderId: gw.id, sortOrder: 4,  indentLevel: 2, itemRef: "A.2.2", description: "Site cabins & welfare facilities",                                  contractValue: 7000 },
      { subcontractOrderId: gw.id, sortOrder: 5,  indentLevel: 0, itemRef: "B",     description: "Earthworks",                                                        contractValue: 0 },
      { subcontractOrderId: gw.id, sortOrder: 6,  indentLevel: 1, itemRef: "B.1",   description: "Strip topsoil & stockpile (allow 2,500 m³)",                        contractValue: 8000 },
      { subcontractOrderId: gw.id, sortOrder: 7,  indentLevel: 1, itemRef: "B.2",   description: "Bulk excavation to formation level",                                contractValue: 0 },
      { subcontractOrderId: gw.id, sortOrder: 8,  indentLevel: 2, itemRef: "B.2.1", description: "Excavation by machine to reduced levels",                           contractValue: 22000 },
      { subcontractOrderId: gw.id, sortOrder: 9,  indentLevel: 2, itemRef: "B.2.2", description: "Cart away & disposal to approved tip",                              contractValue: 13000 },
      { subcontractOrderId: gw.id, sortOrder: 10, indentLevel: 1, itemRef: "B.3",   description: "Backfill, compaction & granular blinding",                          contractValue: 22000 },
      { subcontractOrderId: gw.id, sortOrder: 11, indentLevel: 0, itemRef: "C",     description: "Piling",                                                            contractValue: 0 },
      { subcontractOrderId: gw.id, sortOrder: 12, indentLevel: 1, itemRef: "C.1",   description: "Pile design & load testing (4 nr test piles)",                      contractValue: 18000 },
      { subcontractOrderId: gw.id, sortOrder: 13, indentLevel: 1, itemRef: "C.2",   description: "CFA bearing piles — 150 nr × 450mm dia",                            contractValue: 62000 },
      { subcontractOrderId: gw.id, sortOrder: 14, indentLevel: 1, itemRef: "C.3",   description: "Pile caps, capping beams & starter bars",                           contractValue: 15000 },
      { subcontractOrderId: gw.id, sortOrder: 15, indentLevel: 0, itemRef: "D",     description: "Site Drainage",                                                     contractValue: 0 },
      { subcontractOrderId: gw.id, sortOrder: 16, indentLevel: 1, itemRef: "D.1",   description: "Foul water drainage, manholes & connections",                       contractValue: 18000 },
      { subcontractOrderId: gw.id, sortOrder: 17, indentLevel: 1, itemRef: "D.2",   description: "Surface water drainage",                                            contractValue: 0 },
      { subcontractOrderId: gw.id, sortOrder: 18, indentLevel: 2, itemRef: "D.2.1", description: "SW pipework, gullies & inspection chambers",                        contractValue: 11000 },
      { subcontractOrderId: gw.id, sortOrder: 19, indentLevel: 2, itemRef: "D.2.2", description: "Underground attenuation tank & outfall",                            contractValue: 11000 },
      { subcontractOrderId: gw.id, sortOrder: 20, indentLevel: 1, itemRef: "D.3",   description: "Drainage connections to adopted sewer",                             contractValue: 8000 },
      { subcontractOrderId: gw.id, sortOrder: 21, indentLevel: 0, itemRef: "E",     description: "In-Situ Concrete",                                                  contractValue: 0 },
      { subcontractOrderId: gw.id, sortOrder: 22, indentLevel: 1, itemRef: "E.1",   description: "Reinforced concrete ground beams",                                  contractValue: 28000 },
      { subcontractOrderId: gw.id, sortOrder: 23, indentLevel: 1, itemRef: "E.2",   description: "Reinforced concrete ground floor slab",                             contractValue: 22000 },
    ],
  })

  // Steelwork BOQ  (total £420,000)
  await db.activityScheduleLine.createMany({
    data: [
      { subcontractOrderId: sw.id, sortOrder: 0,  indentLevel: 0, itemRef: "A",     description: "Design & Fabrication",                                              contractValue: 0 },
      { subcontractOrderId: sw.id, sortOrder: 1,  indentLevel: 1, itemRef: "A.1",   description: "Structural design, calculations & client approvals",                contractValue: 25000 },
      { subcontractOrderId: sw.id, sortOrder: 2,  indentLevel: 1, itemRef: "A.2",   description: "Shop drawings, detailing & approval process",                       contractValue: 15000 },
      { subcontractOrderId: sw.id, sortOrder: 3,  indentLevel: 1, itemRef: "A.3",   description: "Steel fabrication",                                                 contractValue: 0 },
      { subcontractOrderId: sw.id, sortOrder: 4,  indentLevel: 2, itemRef: "A.3.1", description: "Primary members — columns, rafters & portal frames",                contractValue: 95000 },
      { subcontractOrderId: sw.id, sortOrder: 5,  indentLevel: 2, itemRef: "A.3.2", description: "Secondary members — purlins, side rails & bracing",                 contractValue: 45000 },
      { subcontractOrderId: sw.id, sortOrder: 6,  indentLevel: 2, itemRef: "A.3.3", description: "Connections, base plates, cleats & HDG bolts",                      contractValue: 30000 },
      { subcontractOrderId: sw.id, sortOrder: 7,  indentLevel: 0, itemRef: "B",     description: "Surface Treatment",                                                 contractValue: 0 },
      { subcontractOrderId: sw.id, sortOrder: 8,  indentLevel: 1, itemRef: "B.1",   description: "Blast cleaning to Sa 2.5 & zinc primer",                            contractValue: 25000 },
      { subcontractOrderId: sw.id, sortOrder: 9,  indentLevel: 1, itemRef: "B.2",   description: "Intumescent fire protection coating (1-hr rating)",                 contractValue: 35000 },
      { subcontractOrderId: sw.id, sortOrder: 10, indentLevel: 1, itemRef: "B.3",   description: "Topcoat, touch-up on site & finish inspection",                     contractValue: 15000 },
      { subcontractOrderId: sw.id, sortOrder: 11, indentLevel: 0, itemRef: "C",     description: "Delivery & Erection",                                               contractValue: 0 },
      { subcontractOrderId: sw.id, sortOrder: 12, indentLevel: 1, itemRef: "C.1",   description: "Craneage, mobile plant & lifting equipment",                        contractValue: 40000 },
      { subcontractOrderId: sw.id, sortOrder: 13, indentLevel: 1, itemRef: "C.2",   description: "Erection & plumbing up",                                            contractValue: 0 },
      { subcontractOrderId: sw.id, sortOrder: 14, indentLevel: 2, itemRef: "C.2.1", description: "Erection of primary structural frame",                              contractValue: 35000 },
      { subcontractOrderId: sw.id, sortOrder: 15, indentLevel: 2, itemRef: "C.2.2", description: "Secondary steelwork installation & final bolting",                  contractValue: 20000 },
      { subcontractOrderId: sw.id, sortOrder: 16, indentLevel: 1, itemRef: "C.3",   description: "Survey, plumb check & load test certification",                     contractValue: 15000 },
      { subcontractOrderId: sw.id, sortOrder: 17, indentLevel: 0, itemRef: "D",     description: "Preliminaries & Sundries",                                          contractValue: 0 },
      { subcontractOrderId: sw.id, sortOrder: 18, indentLevel: 1, itemRef: "D.1",   description: "Method statements, RAMS & H&S documentation",                      contractValue: 5000 },
      { subcontractOrderId: sw.id, sortOrder: 19, indentLevel: 1, itemRef: "D.2",   description: "Specialist supervision & quality management plan",                  contractValue: 12000 },
      { subcontractOrderId: sw.id, sortOrder: 20, indentLevel: 1, itemRef: "D.3",   description: "Defects period allowance & post-completion survey",                 contractValue: 8000 },
    ],
  })

  // M&E BOQ  (total £195,000)
  await db.activityScheduleLine.createMany({
    data: [
      { subcontractOrderId: me.id, sortOrder: 0,  indentLevel: 0, itemRef: "M",     description: "Mechanical Works",                                                  contractValue: 0 },
      { subcontractOrderId: me.id, sortOrder: 1,  indentLevel: 1, itemRef: "M.1",   description: "Boiler house & plant room",                                         contractValue: 0 },
      { subcontractOrderId: me.id, sortOrder: 2,  indentLevel: 2, itemRef: "M.1.1", description: "Gas condensing boilers (2 nr × 200kW)",                             contractValue: 22000 },
      { subcontractOrderId: me.id, sortOrder: 3,  indentLevel: 2, itemRef: "M.1.2", description: "Buffer vessels, pressurisation units & pumps",                      contractValue: 12000 },
      { subcontractOrderId: me.id, sortOrder: 4,  indentLevel: 2, itemRef: "M.1.3", description: "Primary pipework, valves, strainers & insulation",                  contractValue: 8000 },
      { subcontractOrderId: me.id, sortOrder: 5,  indentLevel: 1, itemRef: "M.2",   description: "HVAC distribution",                                                 contractValue: 0 },
      { subcontractOrderId: me.id, sortOrder: 6,  indentLevel: 2, itemRef: "M.2.1", description: "Galvanised ductwork, supports & anti-vibration mounts",             contractValue: 18000 },
      { subcontractOrderId: me.id, sortOrder: 7,  indentLevel: 2, itemRef: "M.2.2", description: "Air handling units & fan coil units (12 nr)",                       contractValue: 14000 },
      { subcontractOrderId: me.id, sortOrder: 8,  indentLevel: 2, itemRef: "M.2.3", description: "Supply/extract grilles, diffusers, dampers & BMS controls",         contractValue: 6000 },
      { subcontractOrderId: me.id, sortOrder: 9,  indentLevel: 1, itemRef: "M.3",   description: "Plumbing & drainage",                                               contractValue: 0 },
      { subcontractOrderId: me.id, sortOrder: 10, indentLevel: 2, itemRef: "M.3.1", description: "Cold water services, boosted cold & break cistern",                  contractValue: 12000 },
      { subcontractOrderId: me.id, sortOrder: 11, indentLevel: 2, itemRef: "M.3.2", description: "Hot water distribution & DHWS cylinders",                           contractValue: 13000 },
      { subcontractOrderId: me.id, sortOrder: 12, indentLevel: 2, itemRef: "M.3.3", description: "Sanitary ware, fittings & above-ground drainage",                   contractValue: 10000 },
      { subcontractOrderId: me.id, sortOrder: 13, indentLevel: 0, itemRef: "E",     description: "Electrical Works",                                                  contractValue: 0 },
      { subcontractOrderId: me.id, sortOrder: 14, indentLevel: 1, itemRef: "E.1",   description: "LV distribution & switchgear",                                      contractValue: 0 },
      { subcontractOrderId: me.id, sortOrder: 15, indentLevel: 2, itemRef: "E.1.1", description: "Main LV switchgear, MCCB panels & metering",                        contractValue: 16000 },
      { subcontractOrderId: me.id, sortOrder: 16, indentLevel: 2, itemRef: "E.1.2", description: "Sub-distribution boards & final circuit wiring",                    contractValue: 12000 },
      { subcontractOrderId: me.id, sortOrder: 17, indentLevel: 1, itemRef: "E.2",   description: "Lighting & small power",                                            contractValue: 0 },
      { subcontractOrderId: me.id, sortOrder: 18, indentLevel: 2, itemRef: "E.2.1", description: "General LED lighting & DALI controls",                              contractValue: 12000 },
      { subcontractOrderId: me.id, sortOrder: 19, indentLevel: 2, itemRef: "E.2.2", description: "Emergency lighting & maintained exit signs",                        contractValue: 6000 },
      { subcontractOrderId: me.id, sortOrder: 20, indentLevel: 2, itemRef: "E.2.3", description: "External & car park LED lighting",                                  contractValue: 4000 },
      { subcontractOrderId: me.id, sortOrder: 21, indentLevel: 1, itemRef: "E.3",   description: "Fire alarm & specialist systems",                                   contractValue: 0 },
      { subcontractOrderId: me.id, sortOrder: 22, indentLevel: 2, itemRef: "E.3.1", description: "Addressable fire alarm system (L1 category)",                       contractValue: 10000 },
      { subcontractOrderId: me.id, sortOrder: 23, indentLevel: 2, itemRef: "E.3.2", description: "Structured data cabling & AV infrastructure",                       contractValue: 7000 },
      { subcontractOrderId: me.id, sortOrder: 24, indentLevel: 2, itemRef: "E.3.3", description: "EV charging (3 nr × 7kW Type 2 outlets)",                           contractValue: 3000 },
      { subcontractOrderId: me.id, sortOrder: 25, indentLevel: 1, itemRef: "E.4",   description: "Cable management, trunking, containment & earthing",                contractValue: 10000 },
    ],
  })

  // Cladding BOQ  (total £340,000)
  await db.activityScheduleLine.createMany({
    data: [
      { subcontractOrderId: cl.id, sortOrder: 0,  indentLevel: 0, itemRef: "A",     description: "Subframe & Support System",                                         contractValue: 0 },
      { subcontractOrderId: cl.id, sortOrder: 1,  indentLevel: 1, itemRef: "A.1",   description: "Primary subframe system",                                           contractValue: 0 },
      { subcontractOrderId: cl.id, sortOrder: 2,  indentLevel: 2, itemRef: "A.1.1", description: "Main structural brackets & fixings to concrete structure",          contractValue: 28000 },
      { subcontractOrderId: cl.id, sortOrder: 3,  indentLevel: 2, itemRef: "A.1.2", description: "Intermediate horizontal & vertical carrier framing",                contractValue: 17000 },
      { subcontractOrderId: cl.id, sortOrder: 4,  indentLevel: 1, itemRef: "A.2",   description: "Phenolic thermal insulation boards & mechanical fixings",           contractValue: 25000 },
      { subcontractOrderId: cl.id, sortOrder: 5,  indentLevel: 1, itemRef: "A.3",   description: "Cavity barriers, fire stops, closures & DPC",                       contractValue: 15000 },
      { subcontractOrderId: cl.id, sortOrder: 6,  indentLevel: 0, itemRef: "B",     description: "Cladding Panels & Curtain Walling",                                 contractValue: 0 },
      { subcontractOrderId: cl.id, sortOrder: 7,  indentLevel: 1, itemRef: "B.1",   description: "Rainscreen cladding panels",                                        contractValue: 0 },
      { subcontractOrderId: cl.id, sortOrder: 8,  indentLevel: 2, itemRef: "B.1.1", description: "Ground floor — aluminium composite panels",                         contractValue: 35000 },
      { subcontractOrderId: cl.id, sortOrder: 9,  indentLevel: 2, itemRef: "B.1.2", description: "Upper floors — terracotta rainscreen cladding system",              contractValue: 45000 },
      { subcontractOrderId: cl.id, sortOrder: 10, indentLevel: 2, itemRef: "B.1.3", description: "Soffits, returns, coping details & trim",                           contractValue: 15000 },
      { subcontractOrderId: cl.id, sortOrder: 11, indentLevel: 1, itemRef: "B.2",   description: "Curtain walling system",                                            contractValue: 0 },
      { subcontractOrderId: cl.id, sortOrder: 12, indentLevel: 2, itemRef: "B.2.1", description: "Curtain wall frames, mullions, transoms & fixings",                 contractValue: 30000 },
      { subcontractOrderId: cl.id, sortOrder: 13, indentLevel: 2, itemRef: "B.2.2", description: "Double-glazed units, glazing beads & silicone seals",               contractValue: 20000 },
      { subcontractOrderId: cl.id, sortOrder: 14, indentLevel: 1, itemRef: "B.3",   description: "Entrance canopy & feature architectural elements",                  contractValue: 20000 },
      { subcontractOrderId: cl.id, sortOrder: 15, indentLevel: 0, itemRef: "C",     description: "Openings, Seals & Finishes",                                        contractValue: 0 },
      { subcontractOrderId: cl.id, sortOrder: 16, indentLevel: 1, itemRef: "C.1",   description: "Window opening reveals, cills, soffits & head trims",               contractValue: 22000 },
      { subcontractOrderId: cl.id, sortOrder: 17, indentLevel: 1, itemRef: "C.2",   description: "Sealants & movement flashings",                                     contractValue: 0 },
      { subcontractOrderId: cl.id, sortOrder: 18, indentLevel: 2, itemRef: "C.2.1", description: "Horizontal movement & storey height joints",                        contractValue: 8000 },
      { subcontractOrderId: cl.id, sortOrder: 19, indentLevel: 2, itemRef: "C.2.2", description: "Vertical perimeter seals, closers & back-up rod",                   contractValue: 10000 },
      { subcontractOrderId: cl.id, sortOrder: 20, indentLevel: 1, itemRef: "C.3",   description: "High-performance powder coat & surface finishes",                   contractValue: 15000 },
      { subcontractOrderId: cl.id, sortOrder: 21, indentLevel: 0, itemRef: "D",     description: "Preliminaries & Testing",                                           contractValue: 0 },
      { subcontractOrderId: cl.id, sortOrder: 22, indentLevel: 1, itemRef: "D.1",   description: "Method statements, RAMS & insurance certificates",                  contractValue: 8000 },
      { subcontractOrderId: cl.id, sortOrder: 23, indentLevel: 1, itemRef: "D.2",   description: "Scaffolding, MEWP access & working at height plans",                contractValue: 18000 },
      { subcontractOrderId: cl.id, sortOrder: 24, indentLevel: 1, itemRef: "D.3",   description: "Water tightness tests, defect inspections & O&M manuals",           contractValue: 9000 },
    ],
  })
  console.log("Created hierarchical activity schedule lines (BOQs) for all 4 contracts")

  // ── Generate payment cycles ────────────────────────────────────────────────
  for (const order of [gw, sw, me, cl]) {
    if (!order.paymentSchedule) continue
    const cycles = generateCycles(order.paymentSchedule)
    await db.paymentCycle.createMany({
      data: cycles.map((c) => ({
        paymentScheduleId: order.paymentSchedule!.id,
        cycleNumber: c.cycleNumber,
        applicationExpectedDate: c.applicationExpectedDate,
        dueDate: c.dueDate,
        paymentNoticeDeadline: c.paymentNoticeDeadline,
        finalDateForPayment: c.finalDateForPayment,
        payLessDeadline: c.payLessDeadline,
        dateDerivation: c.dateDerivation,
      })),
    })
  }
  console.log("Generated payment cycles for all 4 contracts")

  // ── Cycle scenarios ────────────────────────────────────────────────────────

  // SC-001 Groundworks cycle 1: PAID
  const gwCycle1 = await db.paymentCycle.findFirst({
    where: { paymentScheduleId: gw.paymentSchedule!.id, cycleNumber: 1 },
  })
  if (gwCycle1) {
    await db.paymentCycle.update({
      where: { id: gwCycle1.id },
      data: {
        status: "PAID",
        application: {
          create: {
            amountApplied: 42000,
            dateReceived: new Date(today.getTime() - 35 * 86_400_000),
            receivedVia: "email",
          },
        },
      },
    })
    await db.paymentNotice.create({
      data: {
        paymentCycleId: gwCycle1.id,
        status: "SERVED",
        sumDue: 38000,
        basis: "Assessment of works completed to end of month: site clearance, establishment and excavation commenced",
        servedAt: new Date(today.getTime() - 28 * 86_400_000),
        serviceMethod: "EMAIL",
      },
    })
  }

  // SC-001 Groundworks cycle 2: APPLICATION_RECEIVED — notice due in 2 days (URGENT/RED)
  const gwCycle2 = await db.paymentCycle.findFirst({
    where: { paymentScheduleId: gw.paymentSchedule!.id, cycleNumber: 2 },
  })
  if (gwCycle2) {
    const urgentPNDeadline = new Date(today.getTime() + 2 * 86_400_000)
    await db.paymentCycle.update({
      where: { id: gwCycle2.id },
      data: {
        status: "APPLICATION_RECEIVED",
        paymentNoticeDeadline: urgentPNDeadline,
        finalDateForPayment: new Date(urgentPNDeadline.getTime() + 16 * 86_400_000),
        payLessDeadline: new Date(urgentPNDeadline.getTime() + 9 * 86_400_000),
        application: {
          create: {
            amountApplied: 72500,
            dateReceived: new Date(today.getTime() - 5 * 86_400_000),
            receivedVia: "email",
          },
        },
      },
    })
    const assessment = await db.assessment.create({
      data: {
        paymentCycleId: gwCycle2.id,
        grossValuation: 68000,
        retentionAmount: 3400,
        previouslyCert: 38000,
        netThisCycle: 26600,
        lastSavedAt: new Date(),
      },
    })
    await db.assessmentLine.createMany({
      data: [
        { assessmentId: assessment.id, sortOrder: 0, itemRef: "A", description: "Preliminary Works",  contractValue: 27000, valueToDate: 19000, previouslyCertified: 19000, thisCycle: 0 },
        { assessmentId: assessment.id, sortOrder: 1, itemRef: "B", description: "Earthworks",         contractValue: 65000, valueToDate: 35000, previouslyCertified: 19000, thisCycle: 16000 },
        { assessmentId: assessment.id, sortOrder: 2, itemRef: "C", description: "Piling",             contractValue: 95000, valueToDate: 14000, previouslyCertified: 0,     thisCycle: 14000 },
        { assessmentId: assessment.id, sortOrder: 3, itemRef: "D", description: "Site Drainage",      contractValue: 48000, valueToDate: 0,     previouslyCertified: 0,     thisCycle: 0 },
        { assessmentId: assessment.id, sortOrder: 4, itemRef: "E", description: "In-Situ Concrete",   contractValue: 50000, valueToDate: 0,     previouslyCertified: 0,     thisCycle: 0 },
      ],
    })
  }

  // SC-002 Steelwork cycle 1: APPLICATION_RECEIVED — deadline breached 3 days ago (RED)
  const swCycle1 = await db.paymentCycle.findFirst({
    where: { paymentScheduleId: sw.paymentSchedule!.id, cycleNumber: 1 },
  })
  if (swCycle1) {
    const breachedPNDeadline = new Date(today.getTime() - 3 * 86_400_000)
    await db.paymentCycle.update({
      where: { id: swCycle1.id },
      data: {
        status: "APPLICATION_RECEIVED",
        paymentNoticeDeadline: breachedPNDeadline,
        payLessDeadline: new Date(breachedPNDeadline.getTime() + 9 * 86_400_000),
        finalDateForPayment: new Date(breachedPNDeadline.getTime() + 16 * 86_400_000),
        application: {
          create: {
            amountApplied: 185000,
            dateReceived: new Date(today.getTime() - 12 * 86_400_000),
            receivedVia: "email",
          },
        },
      },
    })
  }

  // SC-003 M&E cycle 1: PAID
  const meCycle1 = await db.paymentCycle.findFirst({
    where: { paymentScheduleId: me.paymentSchedule!.id, cycleNumber: 1 },
  })
  if (meCycle1) {
    await db.paymentCycle.update({
      where: { id: meCycle1.id },
      data: {
        status: "PAID",
        application: {
          create: {
            amountApplied: 52000,
            dateReceived: new Date(today.getTime() - 50 * 86_400_000),
            receivedVia: "email",
          },
        },
      },
    })
    await db.paymentNotice.create({
      data: {
        paymentCycleId: meCycle1.id,
        status: "SERVED",
        sumDue: 45000,
        basis: "Assessment: mechanical plant and boiler house substantially complete, LV switchgear and main distribution boards installed, first fix electrical works 60% complete",
        servedAt: new Date(today.getTime() - 45 * 86_400_000),
        serviceMethod: "EMAIL",
      },
    })
  }

  // SC-003 M&E cycle 2: NOTICE_SERVED — pay-less deadline 4 days away (AMBER)
  const meCycle2 = await db.paymentCycle.findFirst({
    where: { paymentScheduleId: me.paymentSchedule!.id, cycleNumber: 2 },
  })
  if (meCycle2) {
    const mePLDeadline = new Date(today.getTime() + 4 * 86_400_000)
    await db.paymentCycle.update({
      where: { id: meCycle2.id },
      data: {
        status: "NOTICE_SERVED",
        paymentNoticeDeadline: new Date(today.getTime() - 7 * 86_400_000),
        payLessDeadline: mePLDeadline,
        finalDateForPayment: new Date(mePLDeadline.getTime() + 7 * 86_400_000),
        application: {
          create: {
            amountApplied: 62000,
            dateReceived: new Date(today.getTime() - 15 * 86_400_000),
            receivedVia: "email",
          },
        },
      },
    })
    await db.paymentNotice.create({
      data: {
        paymentCycleId: meCycle2.id,
        status: "SERVED",
        sumDue: 42000,
        basis: "Assessment: HVAC distribution 70% installed, second fix electrical commenced, fire alarm first fix complete. Deduction for defective ductwork sealant — remeasure pending",
        servedAt: new Date(today.getTime() - 6 * 86_400_000),
        serviceMethod: "EMAIL",
      },
    })
  }

  // SC-004 Cladding cycle 1: NOTICE_SERVED — pay-less deadline 5 days away (AMBER)
  const clCycle1 = await db.paymentCycle.findFirst({
    where: { paymentScheduleId: cl.paymentSchedule!.id, cycleNumber: 1 },
  })
  if (clCycle1) {
    const clPLDeadline = new Date(today.getTime() + 5 * 86_400_000)
    await db.paymentCycle.update({
      where: { id: clCycle1.id },
      data: {
        status: "NOTICE_SERVED",
        paymentNoticeDeadline: new Date(today.getTime() - 8 * 86_400_000),
        payLessDeadline: clPLDeadline,
        finalDateForPayment: new Date(clPLDeadline.getTime() + 7 * 86_400_000),
        application: {
          create: {
            amountApplied: 75000,
            dateReceived: new Date(today.getTime() - 20 * 86_400_000),
            receivedVia: "post",
          },
        },
      },
    })
    await db.paymentNotice.create({
      data: {
        paymentCycleId: clCycle1.id,
        status: "SERVED",
        sumDue: 62000,
        basis: "Assessment: subframe substantially complete (95%), thermal insulation boards 80% installed, ground floor cladding panels commenced. PC and upper floor works not yet started",
        servedAt: new Date(today.getTime() - 7 * 86_400_000),
        serviceMethod: "EMAIL",
      },
    })
  }

  console.log("Set cycle states: 2× PAID, 1× URGENT (GW +2d), 1× BREACHED (SW −3d), 2× NOTICE_SERVED (M&E +4d / Cladding +5d)")

  // ── Variations on M&E ─────────────────────────────────────────────────────
  await db.variation.createMany({
    data: [
      {
        subcontractOrderId: me.id,
        reference: "VAR-ME-001",
        description: "Additional external LED lighting — extended to include overflow car park area on north elevation",
        status: "AGREED",
        estimatedValue: 12000,
        agreedValue: 15000,
        notes: "Agreed at valuation meeting 15 May 2026 at rates per Schedule 2. Instruction ref: AI-047.",
        attachmentUrls: [],
      },
      {
        subcontractOrderId: me.id,
        reference: "VAR-ME-002",
        description: "Additional mechanical connections for supplementary AHU in plant room extension",
        status: "PROPOSED",
        estimatedValue: 8000,
        notes: "Awaiting architect instruction. Day-work sheet DW-012 submitted. Prelim estimate only.",
        attachmentUrls: [],
      },
    ],
  })
  console.log("Created 2 variations on M&E (1 AGREED £15k, 1 PROPOSED est. £8k)")

  // ── Audit events ─────────────────────────────────────────────────────────
  await db.auditEvent.createMany({
    data: [
      { organisationId: org.id, subcontractOrderId: gw.id, eventType: "subcontract.created", payload: { reference: "SEED-SC-001", contractSum: 285000 } },
      { organisationId: org.id, subcontractOrderId: gw.id, eventType: "application.logged", payload: { cycleNumber: 2, amountApplied: 72500, receivedVia: "email" } },
      ...(gwCycle1 ? [{ organisationId: org.id, subcontractOrderId: gw.id, paymentCycleId: gwCycle1.id, eventType: "notice.payment.served", payload: { sumDue: 38000, serviceMethod: "EMAIL" } }] : []),
      { organisationId: org.id, subcontractOrderId: sw.id, eventType: "subcontract.created", payload: { reference: "SEED-SC-002", contractSum: 420000 } },
      { organisationId: org.id, subcontractOrderId: sw.id, eventType: "application.logged", payload: { cycleNumber: 1, amountApplied: 185000, receivedVia: "email" } },
      { organisationId: org.id, subcontractOrderId: sw.id, eventType: "deadline.breached", payload: { cycleNumber: 1, daysOverdue: 3 } },
      { organisationId: org.id, subcontractOrderId: me.id, eventType: "subcontract.created", payload: { reference: "SEED-SC-003", contractSum: 195000 } },
      { organisationId: org.id, subcontractOrderId: me.id, eventType: "application.logged", payload: { cycleNumber: 1, amountApplied: 52000, receivedVia: "email" } },
      ...(meCycle1 ? [{ organisationId: org.id, subcontractOrderId: me.id, paymentCycleId: meCycle1.id, eventType: "notice.payment.served", payload: { sumDue: 45000, serviceMethod: "EMAIL" } }] : []),
      { organisationId: org.id, subcontractOrderId: me.id, eventType: "application.logged", payload: { cycleNumber: 2, amountApplied: 62000, receivedVia: "email" } },
      ...(meCycle2 ? [{ organisationId: org.id, subcontractOrderId: me.id, paymentCycleId: meCycle2.id, eventType: "notice.payment.served", payload: { sumDue: 42000, serviceMethod: "EMAIL" } }] : []),
      { organisationId: org.id, subcontractOrderId: me.id, eventType: "variation.created", payload: { reference: "VAR-ME-001", status: "AGREED", agreedValue: 15000 } },
      { organisationId: org.id, subcontractOrderId: cl.id, eventType: "subcontract.created", payload: { reference: "SEED-SC-004", contractSum: 340000 } },
      { organisationId: org.id, subcontractOrderId: cl.id, eventType: "application.logged", payload: { cycleNumber: 1, amountApplied: 75000, receivedVia: "post" } },
      ...(clCycle1 ? [{ organisationId: org.id, subcontractOrderId: cl.id, paymentCycleId: clCycle1.id, eventType: "notice.payment.served", payload: { sumDue: 62000, serviceMethod: "EMAIL" } }] : []),
    ],
  })

  console.log(`
✅ Seed complete. You now have:

Projects
  • SEED-PRJ-001  Highfield Gardens — Phase 2  (Birmingham)
  • SEED-PRJ-002  Elmwood Heights — Block B     (Solihull)

Subcontracts & BOQs (all hierarchical — 3 indent levels)
  • SEED-SC-001  Apex Groundworks    £285,000  PRJ-001  5 sections, 24 lines
  • SEED-SC-002  Midland Steel       £420,000  PRJ-001  4 sections, 21 lines
  • SEED-SC-003  Premier M&E         £195,000  PRJ-001  2 sections, 26 lines  + 2 variations
  • SEED-SC-004  Cladwell Cladding   £340,000  PRJ-002  4 sections, 25 lines

Cycle states
  • SC-001 cycle 1  PAID (notice served, £38k)
  • SC-001 cycle 2  APPLICATION_RECEIVED — URGENT (PN deadline in 2 days) + assessment pre-filled
  • SC-002 cycle 1  APPLICATION_RECEIVED — BREACHED (3 days overdue)
  • SC-003 cycle 1  PAID (notice served, £45k)
  • SC-003 cycle 2  NOTICE_SERVED — pay-less deadline in 4 days
  • SC-004 cycle 1  NOTICE_SERVED — pay-less deadline in 5 days

Compliance docs  valid / expiring-soon / expired / missing across all 4 subcontractors
Cladding retention  PC release date set (£8,500 due in ~8 months)
  `)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
