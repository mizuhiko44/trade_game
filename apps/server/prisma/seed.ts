import { PrismaClient, ItemType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.avatar.createMany({
    data: [
      { id: "balanced", label: "Balanced", buyPowerMultiplier: 1.0, sellPowerMultiplier: 1.0 },
      { id: "bull", label: "Bull", buyPowerMultiplier: 1.1, sellPowerMultiplier: 0.95 },
      { id: "bear", label: "Bear", buyPowerMultiplier: 0.95, sellPowerMultiplier: 1.1 }
    ],
    skipDuplicates: true
  });

  await prisma.item.createMany({
    data: [
      {
        id: "price_spike",
        itemType: ItemType.PRICE_SPIKE,
        label: "Price Spike",
        description: "目標価格の1歩手前まで価格を動かす",
        powerValue: 1
      },
      {
        id: "shield",
        itemType: ItemType.SHIELD,
        label: "Shield",
        description: "次ターンの相手影響を半減",
        powerValue: 50
      },
      {
        id: "double_force",
        itemType: ItemType.DOUBLE_FORCE,
        label: "Double Force",
        description: "次のBuy/Sellの影響を2倍",
        powerValue: 2
      }
    ],
    skipDuplicates: true
  });

  const user = await prisma.user.upsert({
    where: { id: "demo-user" },
    update: { name: "Demo Player", avatarId: "balanced", lifePoints: 300, coins: 100 },
    create: { id: "demo-user", name: "Demo Player", avatarId: "balanced", lifePoints: 300, coins: 100 }
  });

  for (const itemId of ["price_spike", "shield", "double_force"]) {
    await prisma.userItem.upsert({
      where: { userId_itemId: { userId: user.id, itemId } },
      update: { quantity: 3 },
      create: { userId: user.id, itemId, quantity: 3 }
    });
  }
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
