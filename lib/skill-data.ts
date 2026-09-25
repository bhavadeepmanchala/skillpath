export type Demand = "High" | "Medium" | "Low"
export type Trend = "rising" | "stable" | "declining"

export type Course = {
  title: string
  provider: string
  duration: string
  level: "Beginner" | "Intermediate" | "Advanced"
}

export type SkillAnalysis = {
  bestField: string
  matchScore: number
  demand: Demand
  trend: Trend
  yourSkills: string[]
  missingSkills: string[]
  courses: Course[]
  advice: string
}

// Placeholder/dummy analysis. Replace with a real backend API later.
export const dummyAnalysis: SkillAnalysis = {
  bestField: "Frontend Engineering",
  matchScore: 72,
  demand: "High",
  trend: "rising",
  yourSkills: ["HTML", "CSS", "JavaScript", "React", "Git"],
  missingSkills: [
    "TypeScript",
    "Next.js",
    "Testing (Jest/RTL)",
    "Accessibility (a11y)",
    "System Design",
    "CI/CD",
  ],
  courses: [
    {
      title: "TypeScript for React Developers",
      provider: "Frontend Masters",
      duration: "6 hrs",
      level: "Intermediate",
    },
    {
      title: "The Complete Next.js App Router Course",
      provider: "Vercel Learn",
      duration: "8 hrs",
      level: "Intermediate",
    },
    {
      title: "Testing JavaScript Applications",
      provider: "Udemy",
      duration: "10 hrs",
      level: "Beginner",
    },
    {
      title: "Web Accessibility Fundamentals",
      provider: "Coursera",
      duration: "4 hrs",
      level: "Beginner",
    },
  ],
  advice:
    "You're already 72% aligned with Frontend Engineering — a strong, rising field. Your React and JavaScript foundation is solid, so prioritize TypeScript and Next.js next, since they appear in most modern job listings. Add automated testing to stand out, and build one polished portfolio project that demonstrates all three. Close these gaps and you'll be competitive for junior frontend roles within a few months.",
}

export type FieldDemand = {
  field: string
  demand: Demand
  trend: Trend
  studentsMatched: number
  topMissingSkill: string
}

export const policymakerFields: FieldDemand[] = [
  { field: "Frontend Engineering", demand: "High", trend: "rising", studentsMatched: 1842, topMissingSkill: "TypeScript" },
  { field: "Data Science", demand: "High", trend: "rising", studentsMatched: 1568, topMissingSkill: "SQL" },
  { field: "Backend Engineering", demand: "High", trend: "stable", studentsMatched: 1324, topMissingSkill: "System Design" },
  { field: "Product Design (UI/UX)", demand: "Medium", trend: "stable", studentsMatched: 978, topMissingSkill: "User Research" },
  { field: "DevOps / Cloud", demand: "Medium", trend: "rising", studentsMatched: 746, topMissingSkill: "Kubernetes" },
  { field: "Cybersecurity", demand: "Medium", trend: "rising", studentsMatched: 612, topMissingSkill: "Cloud Security" },
  { field: "Mobile Development", demand: "Low", trend: "declining", studentsMatched: 384, topMissingSkill: "Swift" },
]

export const policymakerGapSkills = ["TypeScript", "SQL", "System Design", "Cloud Security"]

export const careerInterests = [
  "Frontend Engineering",
  "Backend Engineering",
  "Full-Stack Development",
  "Data Science",
  "Machine Learning / AI",
  "DevOps / Cloud",
  "Product Design (UI/UX)",
  "Cybersecurity",
  "Mobile Development",
]
