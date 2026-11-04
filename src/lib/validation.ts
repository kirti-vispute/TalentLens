import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const criterionSchema = z.object({
  skill: z.string().min(1),
  weight: z.number().min(1).max(5),
  required: z.boolean(),
});

export const requisitionSchema = z.object({
  title: z.string().min(2).max(120),
  rawJD: z.string().min(10).max(20000),
  location: z.string().max(60).nullable().optional(),
  experienceMin: z.number().min(0).max(40),
  experienceMax: z.number().min(0).max(40),
  noticeDaysMax: z.number().int().min(0).max(365),
  ctcMax: z.number().min(0).max(10000000).nullable().optional(),
  clientCompanyId: z.string().min(1),
  mustHaveSkills: z.array(criterionSchema).max(20),
  niceToHaveSkills: z.array(criterionSchema).max(20),
});

export const shortlistActionSchema = z.object({
  applicationId: z.string().min(1),
  action: z.enum(["SHORTLIST", "REJECT", "PROPOSE_INTERVIEW"]),
  rejectionReason: z.string().max(500).optional(),
  interviewSlot: z.string().max(200).optional(),
});

export const statusUpdateSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum([
    "SOURCED",
    "SCREENED",
    "SHORTLISTED",
    "CLIENT_REVIEW",
    "INTERVIEW",
    "OFFERED",
    "JOINED",
    "REJECTED",
  ]),
});

export const deleteCandidateSchema = z.object({
  candidateId: z.string().min(1),
  reason: z.string().max(300).optional(),
});
