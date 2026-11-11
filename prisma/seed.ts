import { PrismaClient, HabitType, StreakMode } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_HABITS: Array<{
  id: string;
  name: string;
  type: HabitType;
  unit: string | null;
  streakMode: StreakMode;
  sortOrder: number;
}> = [
  { id: "habit_seed_01", name: "三餐热量差额 > 500", type: "CHECK", unit: null, streakMode: "WEEKDAYS", sortOrder: 0 },
  { id: "habit_seed_02", name: "12 点前入睡", type: "CHECK", unit: null, streakMode: "DAILY", sortOrder: 1 },
  { id: "habit_seed_03", name: "睡前洗澡", type: "CHECK", unit: null, streakMode: "DAILY", sortOrder: 2 },
  { id: "habit_seed_04", name: "放松拉伸", type: "CHECK", unit: null, streakMode: "DAILY", sortOrder: 3 },
  { id: "habit_seed_05", name: "写日记", type: "CHECK", unit: null, streakMode: "DAILY", sortOrder: 4 },
  { id: "habit_seed_06", name: "运动", type: "QUANTITY", unit: "分钟", streakMode: "DAILY", sortOrder: 5 },
  { id: "habit_seed_07", name: "观影看剧", type: "QUANTITY", unit: "分钟", streakMode: "DAILY", sortOrder: 6 },
  { id: "habit_seed_08", name: "学习", type: "QUANTITY", unit: "分钟", streakMode: "DAILY", sortOrder: 7 },
  { id: "habit_seed_09", name: "读书", type: "QUANTITY", unit: "分钟", streakMode: "DAILY", sortOrder: 8 },
];

async function main() {
  for (const h of SEED_HABITS) {
    await prisma.habit.upsert({
      where: { id: h.id },
      create: { ...h, customDays: [] },
      update: {},
    });
  }
  console.log(`Seeded ${SEED_HABITS.length} habits`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
