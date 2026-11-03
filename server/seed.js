require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("./src/prisma");

const recipes = [
    {
        title: "Masala Omelette",
        description: "A quick spicy omelette with onion, tomato and green chili.",
        ingredients: ["2 eggs", "1 small onion", "1 tomato", "1 green chili", "Salt"],
        steps: ["Chop the vegetables", "Beat the eggs with salt", "Cook in a hot pan for 3 minutes"],
        category: "breakfast",
        cookingTime: 10,
        imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80",
    },
    {
        title: "Paneer Butter Masala",
        description: "Creamy tomato gravy with soft paneer cubes, perfect with naan.",
        ingredients: ["250g paneer", "3 tomatoes", "1 cup cream", "2 tbsp butter", "Garam masala"],
        steps: ["Blend the tomatoes into a puree", "Cook the puree with butter and spices", "Add cream and paneer, simmer for 10 minutes"],
        category: "dinner",
        cookingTime: 40,
        imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80",
    },
    {
        title: "Chocolate Mug Cake",
        description: "A single-serving chocolate cake that cooks in the microwave.",
        ingredients: ["4 tbsp flour", "2 tbsp cocoa powder", "3 tbsp sugar", "3 tbsp milk", "1 tbsp oil"],
        steps: ["Mix all ingredients in a mug", "Microwave for 90 seconds", "Let it cool for a minute"],
        category: "dessert",
        cookingTime: 5,
        imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
    },
    {
        title: "Chickpea Salad",
        description: "A fresh, protein-rich salad with cucumber, tomato and lemon dressing.",
        ingredients: ["1 can chickpeas", "1 cucumber", "2 tomatoes", "1 lemon", "Olive oil"],
        steps: ["Chop the vegetables", "Mix with the chickpeas", "Dress with lemon juice, oil and salt"],
        category: "vegan",
        cookingTime: 15,
        imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
    },
    {
        title: "Veg Fried Rice",
        description: "Wok-tossed rice with mixed vegetables and soy sauce.",
        ingredients: ["2 cups cooked rice", "1 carrot", "1 capsicum", "2 tbsp soy sauce", "Spring onion"],
        steps: ["Stir-fry the chopped vegetables on high heat", "Add the rice and soy sauce", "Toss for 3 minutes and serve hot"],
        category: "lunch",
        cookingTime: 20,
        imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80",
    },
];

async function main() {
    let demoUser = await prisma.user.findUnique({ where: { email: "demo@tastebook.com" } });
    if (!demoUser) {
        const hashedPassword = await bcrypt.hash("demo1234", 10);
        demoUser = await prisma.user.create({
            data: {
                name: "Demo Chef",
                email: "demo@tastebook.com",
                password: hashedPassword,
            },
        });
        console.log("Created demo account: demo@tastebook.com");
    } else {
        console.log("Demo user demo@tastebook.com already exists.");
    }

    const recipeCount = await prisma.recipe.count();
    if (recipeCount > 0) {
        console.log(`Database already has ${recipeCount} recipes. Skipping recipe seeding.`);
        return;
    }

    for (const r of recipes) {
        await prisma.recipe.create({
            data: {
                ...r,
                ingredients: JSON.stringify(r.ingredients),
                steps: JSON.stringify(r.steps),
                authorId: demoUser.id,
            },
        });
    }
    console.log(`Added ${recipes.length} sample recipes for ${demoUser.name}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
