import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { scoreCandidate, findDuplicate } from "../src/lib/scoring";

const prisma = new PrismaClient();

const JAVA_CRITERIA_MUST = [
  { skill: "Java", weight: 5, required: true },
  { skill: "Spring Boot", weight: 5, required: true },
  { skill: "Microservices", weight: 3, required: false },
];
const JAVA_CRITERIA_NICE = [
  { skill: "AWS", weight: 2, required: false },
  { skill: "Docker", weight: 2, required: false },
];

const KYC_CRITERIA_MUST = [
  { skill: "KYC", weight: 5, required: true },
  { skill: "AML", weight: 4, required: true },
  { skill: "Excel", weight: 2, required: false },
];
const KYC_CRITERIA_NICE = [
  { skill: "Banking Operations", weight: 3, required: false },
  { skill: "Customer Service", weight: 2, required: false },
];

const CS_CRITERIA_MUST = [
  { skill: "Customer Service", weight: 5, required: true },
  { skill: "Communication", weight: 4, required: true },
];
const CS_CRITERIA_NICE = [{ skill: "Excel", weight: 2, required: false }];

const JAVA_JD = `Senior Java Developer
Northbridge Technologies, Noida
5-8 years experience
We need a Senior Java Developer with strong Spring Boot and microservices experience.
Must have: Java, Spring Boot, Microservices architecture.
Nice to have: AWS, Docker, Kubernetes.
Notice period up to 60 days.
Location: Noida (hybrid).`;

const KYC_JD = `KYC Analyst
Meridian Bank Ops, Noida
2-5 years experience
Looking for a KYC Analyst for our banking back-office process.
Must have: KYC, AML checks, strong Excel skills.
Nice to have: Banking Operations experience, Customer Service.
Notice period up to 45 days.
Location: Noida.`;

const CS_JD = `Customer Service Executive
Oakridge Retail, Pune
1-3 years experience
Looking for a Customer Service Executive for our retail support desk.
Must have: Customer Service, Communication.
Nice to have: Excel.
Notice period up to 30 days.
Location: Pune.`;

function resume(name: string, lines: string[]): string {
  return [name, "", ...lines].join("\n");
}

async function main() {
  console.log("Seeding database...");

  const northbridge = await prisma.clientCompany.create({
    data: { name: "Northbridge Technologies" },
  });
  const meridian = await prisma.clientCompany.create({
    data: { name: "Meridian Bank Ops" },
  });
  const oakridge = await prisma.clientCompany.create({
    data: { name: "Oakridge Retail" },
  });

  const passwordHash = await bcrypt.hash("Demo@1234", 10);

  const recruiter = await prisma.user.create({
    data: {
      email: "recruiter@talentlens.app",
      name: "Priya Sharma",
      role: "RECRUITER",
      passwordHash,
    },
  });

  const clientNorthbridge = await prisma.user.create({
    data: {
      email: "client.northbridge@talentlens.app",
      name: "Karan Mehta",
      role: "CLIENT",
      passwordHash,
      clientCompanyId: northbridge.id,
    },
  });

  const clientMeridian = await prisma.user.create({
    data: {
      email: "client.meridian@talentlens.app",
      name: "Divya Rao",
      role: "CLIENT",
      passwordHash,
      clientCompanyId: meridian.id,
    },
  });

  const clientOakridge = await prisma.user.create({
    data: {
      email: "client.oakridge@talentlens.app",
      name: "Rohan Kapoor",
      role: "CLIENT",
      passwordHash,
      clientCompanyId: oakridge.id,
    },
  });

  const reqJava = await prisma.requisition.create({
    data: {
      title: "Senior Java Developer",
      rawJD: JAVA_JD,
      location: "Noida",
      experienceMin: 5,
      experienceMax: 8,
      noticeDaysMax: 60,
      ctcMax: 1800000,
      mustHaveSkills: JSON.stringify(JAVA_CRITERIA_MUST),
      niceToHaveSkills: JSON.stringify(JAVA_CRITERIA_NICE),
      clientCompanyId: northbridge.id,
      createdById: recruiter.id,
    },
  });

  const reqKyc = await prisma.requisition.create({
    data: {
      title: "KYC Analyst",
      rawJD: KYC_JD,
      location: "Noida",
      experienceMin: 2,
      experienceMax: 5,
      noticeDaysMax: 45,
      ctcMax: 600000,
      mustHaveSkills: JSON.stringify(KYC_CRITERIA_MUST),
      niceToHaveSkills: JSON.stringify(KYC_CRITERIA_NICE),
      clientCompanyId: meridian.id,
      createdById: recruiter.id,
    },
  });

  const reqCS = await prisma.requisition.create({
    data: {
      title: "Customer Service Executive",
      rawJD: CS_JD,
      location: "Pune",
      experienceMin: 1,
      experienceMax: 3,
      noticeDaysMax: 30,
      ctcMax: 350000,
      mustHaveSkills: JSON.stringify(CS_CRITERIA_MUST),
      niceToHaveSkills: JSON.stringify(CS_CRITERIA_NICE),
      clientCompanyId: oakridge.id,
      createdById: recruiter.id,
    },
  });

  const javaCandidates = [
    {
      extId: "CND-91022",
      name: "Ritika Bansal",
      email: "ritika.bansal@example.com",
      phone: "9876543210",
      currentRole: "Senior Java Developer",
      noticeDays: 60,
      text: resume("Ritika Bansal", [
        "Senior Java Developer, 6.5 years experience",
        "Expert in Java and Spring Boot application development",
        "Built Microservices architecture for payments platform",
        "Notice period: 60 days",
      ]),
    },
    {
      extId: "CND-91088",
      name: "Pooja Nair",
      email: "pooja.nair@example.com",
      phone: "9876543211",
      currentRole: "Java Developer",
      noticeDays: 90,
      text: resume("Pooja Nair", [
        "Java Developer, 4.0 years experience",
        "Strong background in Java, Hibernate and REST APIs",
        "Notice period: 90 days",
      ]),
    },
    {
      extId: "CND-91101",
      name: "Sandeep Verma",
      email: "sandeep.verma@example.com",
      phone: "9876543212",
      currentRole: "Java Engineer",
      noticeDays: 45,
      text: resume("Sandeep Verma", [
        "Java Engineer, 7 years experience",
        "Java and Spring Boot specialist with Microservices delivery experience",
        "Hands-on with AWS and Docker for deployment",
        "Notice period: 45 days",
      ]),
    },
    {
      extId: "CND-91115",
      name: "Neha Kulkarni",
      email: "neha.kulkarni@example.com",
      phone: "9876543213",
      currentRole: "Junior Java Developer",
      noticeDays: 30,
      text: resume("Neha Kulkarni", [
        "Junior Java Developer, 2 years experience",
        "Working knowledge of Java and Spring Boot",
        "Notice period: 30 days",
      ]),
    },
    {
      extId: "CND-91120",
      name: "Vikram Joshi",
      email: "vikram.joshi@example.com",
      phone: "9876543214",
      currentRole: "Java Developer",
      noticeDays: 60,
      text: resume("Vikram Joshi", [
        "Java Developer, 6 years experience",
        "Java, Spring Boot, Microservices and AWS",
        "Notice period: 60 days",
      ]),
    },
    {
      // Intentional duplicate: same email/phone as Vikram Joshi above,
      // uploaded again from a different file name — exercises dedupe.
      extId: "CND-91121",
      name: "Vikram Joshi",
      email: "vikram.joshi@example.com",
      phone: "9876543214",
      currentRole: "Java Developer",
      noticeDays: 60,
      text: resume("Vikram Joshi", [
        "Java Developer, 6 years experience",
        "Java, Spring Boot, Microservices and AWS",
        "Notice period: 60 days",
        "(resubmitted copy)",
      ]),
    },
    {
      // Intentionally low-signal: simulates a poorly-OCR'd scanned resume.
      extId: "CND-91130",
      name: "Resume Scan 004",
      email: null,
      phone: null,
      currentRole: null,
      noticeDays: null,
      text: "xJ a v a sp.ring   ---  [illegible scan]",
    },
  ];

  const kycCandidates = [
    {
      extId: "CND-91047",
      name: "Arjun Rawat",
      email: "arjun.rawat@example.com",
      phone: "9876543220",
      currentRole: "KYC Analyst",
      noticeDays: 30,
      text: resume("Arjun Rawat", [
        "KYC Analyst, 3.0 years experience",
        "Daily KYC checks and AML checks for retail onboarding",
        "Advanced Excel for MIS reporting",
        "Notice period: 30 days",
      ]),
    },
    {
      extId: "CND-91141",
      name: "Shreya Iyer",
      email: "shreya.iyer@example.com",
      phone: "9876543221",
      currentRole: "Senior KYC Analyst",
      noticeDays: 30,
      text: resume("Shreya Iyer", [
        "Senior KYC Analyst, 4 years experience",
        "KYC and AML checks for corporate accounts, strong Excel skills",
        "3 years in banking operations for back-office process",
        "Notice period: 30 days",
      ]),
    },
    {
      extId: "CND-91150",
      name: "Rahul Mehta",
      email: "rahul.mehta@example.com",
      phone: "9876543222",
      currentRole: "Customer Service Executive",
      noticeDays: 15,
      text: resume("Rahul Mehta", [
        "Customer Service Executive, 2 years experience",
        "Handled inbound calls and Excel based reporting",
        "Notice period: 15 days",
      ]),
    },
    {
      extId: "CND-91160",
      name: "Fatima Sheikh",
      email: "fatima.sheikh@example.com",
      phone: "9876543223",
      currentRole: "KYC Analyst",
      noticeDays: 90,
      text: resume("Fatima Sheikh", [
        "KYC Analyst, 5.5 years experience",
        "AML checks, KYC checks and banking operations for NRI accounts",
        "Notice period: 90 days",
      ]),
    },
  ];

  const csCandidates = [
    {
      extId: "CND-92010",
      name: "Ananya Krishnan",
      email: "ananya.krishnan@example.com",
      phone: "9876543230",
      currentRole: "Customer Service Executive",
      noticeDays: 20,
      text: resume("Ananya Krishnan", [
        "Customer Service Executive, 2.5 years experience",
        "Strong communication skills, handled 80+ calls daily with high CSAT",
        "Excel for daily reporting",
        "Notice period: 20 days",
      ]),
    },
    {
      extId: "CND-92031",
      name: "Imran Qureshi",
      email: "imran.qureshi@example.com",
      phone: "9876543231",
      currentRole: "Retail Associate",
      noticeDays: 15,
      text: resume("Imran Qureshi", [
        "Retail Associate, 1.5 years experience",
        "Customer service for walk-in retail customers, good communication",
        "Notice period: 15 days",
      ]),
    },
    {
      extId: "CND-92048",
      name: "Sneha Pillai",
      email: "sneha.pillai@example.com",
      phone: "9876543232",
      currentRole: "Front Desk Executive",
      noticeDays: 30,
      text: resume("Sneha Pillai", [
        "Front Desk Executive, 3 years experience",
        "Customer service and communication with walk-in and phone clients",
        "Advanced Excel for daily logs",
        "Notice period: 30 days",
      ]),
    },
    {
      extId: "CND-92055",
      name: "Varun Thakur",
      email: "varun.thakur@example.com",
      phone: "9876543233",
      currentRole: "Data Entry Operator",
      noticeDays: 45,
      text: resume("Varun Thakur", [
        "Data Entry Operator, 1 year experience",
        "Excel data entry, limited customer-facing experience",
        "Notice period: 45 days",
      ]),
    },
  ];

  async function seedApplications(
    candidates: typeof javaCandidates,
    requisitionId: string,
    criteria: { skill: string; weight: number; required: boolean }[],
    jd: { experienceMin: number; experienceMax: number; noticeDaysMax: number }
  ) {
    const existingForDup: { id: string; name: string; email: string | null; phone: string | null }[] = [];
    for (const c of candidates) {
      const experienceYears = c.text.match(/(\d+(?:\.\d+)?)\s*(?:years|yrs)/i);
      const duplicate = findDuplicate(
        { id: "pending", name: c.name, email: c.email, phone: c.phone },
        existingForDup
      );
      const candidate = await prisma.candidate.create({
        data: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          currentRole: c.currentRole,
          experienceYears: experienceYears ? parseFloat(experienceYears[1]) : null,
          keySkills: JSON.stringify([]),
          noticeDays: c.noticeDays,
          resumeText: c.text,
          resumeFileName: `${c.extId}.pdf`,
          duplicateOfId: duplicate?.candidateId ?? null,
        },
      });

      const result = scoreCandidate(criteria, jd, {
        experienceYears: candidate.experienceYears,
        noticeDays: candidate.noticeDays,
        resumeText: candidate.resumeText,
      });

      await prisma.application.create({
        data: {
          requisitionId,
          candidateId: candidate.id,
          score: result.score,
          evidence: JSON.stringify(result.evidence),
          lowConfidence: result.lowConfidence,
          lowConfidenceReasons: JSON.stringify(result.lowConfidenceReasons),
          status: "SCREENED",
        },
      });

      existingForDup.push({ id: candidate.id, name: candidate.name, email: candidate.email, phone: candidate.phone });
    }
  }

  await seedApplications(javaCandidates, reqJava.id, [...JAVA_CRITERIA_MUST, ...JAVA_CRITERIA_NICE], reqJava);
  await seedApplications(kycCandidates, reqKyc.id, [...KYC_CRITERIA_MUST, ...KYC_CRITERIA_NICE], reqKyc);
  await seedApplications(csCandidates, reqCS.id, [...CS_CRITERIA_MUST, ...CS_CRITERIA_NICE], reqCS);

  // Spread every requisition's applications across the whole pipeline —
  // sourced through joined/rejected — so the board and client portal
  // both demo with a realistic, fully-populated spread rather than one
  // lonely card per column.
  async function setStatus(
    requisitionId: string,
    candidateName: string,
    status:
      | "SOURCED"
      | "SCREENED"
      | "SHORTLISTED"
      | "CLIENT_REVIEW"
      | "INTERVIEW"
      | "OFFERED"
      | "JOINED"
      | "REJECTED",
    extra?: { openedByRecruiter?: boolean; rejectionReason?: string; interviewSlot?: string }
  ) {
    const application = await prisma.application.findFirst({
      where: { requisitionId, candidate: { name: candidateName } },
    });
    if (!application) return;
    await prisma.application.update({
      where: { id: application.id },
      data: {
        status,
        openedByRecruiter: extra?.openedByRecruiter ?? application.openedByRecruiter,
        rejectionReason: extra?.rejectionReason ?? null,
        interviewSlot: extra?.interviewSlot ?? null,
        viewedByClientAt: status === "SHORTLISTED" || status === "REJECTED" ? new Date() : null,
      },
    });
  }

  // Senior Java Developer (Northbridge) — one of each stage.
  await setStatus(reqJava.id, "Sandeep Verma", "CLIENT_REVIEW", { openedByRecruiter: true });
  await setStatus(reqJava.id, "Vikram Joshi", "SHORTLISTED", { openedByRecruiter: true });
  await setStatus(reqJava.id, "Ritika Bansal", "INTERVIEW", {
    openedByRecruiter: true,
    interviewSlot: "Thu 13 Nov, 4:00 PM IST",
  });
  await setStatus(reqJava.id, "Pooja Nair", "REJECTED", {
    openedByRecruiter: true,
    rejectionReason: "Notice period too long for this intake.",
  });

  // KYC Analyst (Meridian) — one of each stage.
  await setStatus(reqKyc.id, "Shreya Iyer", "CLIENT_REVIEW", { openedByRecruiter: true });
  await setStatus(reqKyc.id, "Arjun Rawat", "OFFERED", { openedByRecruiter: true });
  await setStatus(reqKyc.id, "Fatima Sheikh", "SHORTLISTED", { openedByRecruiter: true });
  await setStatus(reqKyc.id, "Rahul Mehta", "REJECTED", {
    openedByRecruiter: true,
    rejectionReason: "Missing KYC/AML experience required for this role.",
  });

  // Customer Service Executive (Oakridge) — one of each stage.
  await setStatus(reqCS.id, "Ananya Krishnan", "CLIENT_REVIEW", { openedByRecruiter: true });
  await setStatus(reqCS.id, "Sneha Pillai", "JOINED", { openedByRecruiter: true });
  await setStatus(reqCS.id, "Imran Qureshi", "CLIENT_REVIEW", { openedByRecruiter: true });
  await setStatus(reqCS.id, "Varun Thakur", "REJECTED", {
    openedByRecruiter: true,
    rejectionReason: "No customer-facing experience; profile is data entry focused.",
  });

  console.log("Seed complete.");
  console.log("Recruiter login: recruiter@talentlens.app / Demo@1234");
  console.log("Client (Northbridge) login: client.northbridge@talentlens.app / Demo@1234");
  console.log("Client (Meridian) login: client.meridian@talentlens.app / Demo@1234");
  console.log("Client (Oakridge) login: client.oakridge@talentlens.app / Demo@1234");
  void clientNorthbridge;
  void clientMeridian;
  void clientOakridge;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
