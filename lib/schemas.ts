import { z } from "zod";

export const frequencyEnum = z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY"]);

export const budgetItemSchema = z.object({
    id: z.string().cuid().optional(),
    type: z.enum(["INCOME", "EXPENSE"]),
    name: z.string().min(1),
    amountCents: z.number().int().positive(),
    frequency: frequencyEnum,
    weeklyDay: z.number().int().min(0).max(6).optional(),
    fortnightAnchor: z.coerce.date().optional(),
    monthDay: z.number().int().min(1).max(31).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullish(),
}).superRefine((data, ctx) => {
    if (data.frequency === "WEEKLY" && data.weeklyDay === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "weeklyDay is required for WEEKLY" });
    }
    if (data.frequency === "FORTNIGHTLY" && !data.fortnightAnchor) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "fortnightAnchor is required for FORTNIGHTLY" });
    }
    if (data.frequency === "MONTHLY" && !data.monthDay) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "monthDay is required for MONTHLY" });
    }
});
