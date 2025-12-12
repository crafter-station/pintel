<div align="center">

```
 ____  _       _       _   
|  _ \(_)_ __ | |_ ___| |  
| |_) | | '_ \| __/ _ \ |  
|  __/| | | | | ||  __/ |  
|_|   |_|_| |_|\__\___|_|  
```

<h3>🎨 Play Drawing Games with AI Models 🤖</h3>
<p><strong>A fun, interactive game where you can draw, guess, and compete with artificial intelligence!</strong></p>

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-blue?logo=tailwind-css)

</div>

---

## 📖 About

**pintel** is an interactive AI drawing game where you compete with multiple AI models. It's a fun way to compare how different AI systems draw and guess without needing any technical knowledge.

- **Interactive Gameplay** - Draw, guess, and vote on AI-generated artwork
- **Multiple AI Models** - Play against GPT-4, Claude, Gemini, and Grok all at once
- **Competitive & Fun** - Challenge AI models or watch them compete against each other
- **Creative Freedom** - Use a full-featured drawing canvas with colors and tools
- **Track Performance** - See leaderboards showing which AI models are best at drawing and guessing
-  **Save Your Progress** - Create an account to save all your game sessions

Built for the **Vercel AI Gateway Hackathon** to showcase multi-model AI capabilities in a fun, engaging way.

---

## Features

### Four Fun Game Modes

<details>
<summary><strong> Human Play - Draw and guess with AI friends</strong></summary>

<br/>

It's like a turn-based drawing game! Here's how it works:

- **Your turn to draw**: Get a secret prompt and draw it for 50 seconds while AI models try to guess
- **AI's turn to draw**: Watch as AI models draw prompts, and you have to guess what they're drawing
- **Hints appear**: Letters of the answer gradually reveal every 30 seconds to help you out
- **Real-time guessing**: See all the guesses come in live from AI models
- **Points & Scoring**: Get points when you guess correctly, or when your drawing is guessed first

Play 2 full rounds and see who wins! It's perfect for understanding how AI "thinks" when drawing and recognizing patterns.

</details>

<details>
<summary><strong> Human Judge - Vote for the best AI artwork</strong></summary>

<br/>

You're the judge! Here's what to do:

- **Pick your AI squad**: Choose 2-8 AI models you want to compete
- **Get a prompt**: You'll see a random drawing prompt (like "a robot cooking spaghetti")
- **Watch them draw**: All selected models generate drawings at the same time
- **Vote anonymously**: See the drawings shuffled and vote for your favorite without knowing which AI created it
- **Results revealed**: After voting, find out which AI model created each drawing
- **Leaderboard**: Track which AI models win the most votes over multiple rounds

It's like "Project Runway" but for AI! Perfect for discovering which models have the best artistic style.

</details>

<details>
<summary><strong> Model Guess - Challenge AI to guess your drawing</strong></summary>

<br/>

The AI becomes the guesser! Here's how:

- **You draw**: Get a random prompt and draw whatever you'd like for your chosen AI models
- **AI tries to guess**: Watch as 2-6 AI models analyze your drawing and take guesses
- **Real-time responses**: See guesses appear in real-time as AI models recognize what you drew
- **First correct wins**: The first model to guess correctly gets the point
- **Fuzzy matching**: The AI is smart about variations (like "drawing" vs "drew" both count)
- **Leaderboard**: See which AI models are best at recognizing your drawings

Test how well AI can understand your artistic skills! Sometimes they're spot-on, sometimes hilariously wrong.

</details>

<details>
<summary><strong> AI Duel - Watch AI models compete</strong></summary>

<br/>

Sit back and watch AI models battle it out! Here's what happens:

- **Build your bracket**: Select 3-6 AI models to compete
- **Automated competition**: AI models take turns drawing and guessing automatically
- **Points system**:
  - 3 points for first correct guess
  - 1 point for other correct guesses
  - 1 point for the drawer if nobody guesses
- **8 full rounds** of competition
- **Watch with controls**: Play at normal speed, fast-forward, or jump straight to results
- **Pause anytime**: Stop to look at drawings more closely
- **Live leaderboard**: Watch scores update in real-time

Perfect for comparing AI models head-to-head in a fun tournament format!

</details>

### More Awesome Features

- **Drawing Tools** - Full-featured canvas with:
  - 10 beautiful colors to choose from
  - Pen and eraser tools
  - Adjustable brush sizes (small to large)
  - Undo and redo (up to 50 steps back!)
  - Clear canvas button
  - Works on phones and tablets too

- **Leaderboard** - See how AI models rank:
  - Overall scores across all game modes
  - Who wins most at Human Judge
  - Who guesses best at Model Guess
  - Who wins most AI Duels
  - Total cost spent on all games
  - Total AI tokens used

- **Gallery** - Browse your game history:
  - See all your past games
  - Filter by game mode
  - See the winning drawings
  - Review the prompts you played
  - Check timestamps and costs
  - See which AI models participated

- **Save Progress** - Create a free account to:
  - Keep your game history
  - Compete on global leaderboards
  - Build your personal gallery
  - Compare your performance over time

- **Dark & Light Mode** - Choose what's comfortable for your eyes

- **Cost Transparency** - See how much each game costs in real dollars and AI tokens

---

## Technologies

<div align="center">

**Built with modern, powerful tools**

| Category | What We Use |
|----------|-------------|
|  **Game Interface** | Next.js 15, React 19 |
|  **AI Powers** | GPT-4, Claude, Gemini, Grok (via Vercel AI SDK) |
|  **User Accounts** | Clerk - easy sign-in/sign-up |
|  **Beautiful Design** | Tailwind CSS, shadcn/ui components |
|  **Runtime** | Bun (extremely fast JavaScript runtime) |

These are all modern, industry-standard tools that make the game fast, beautiful, and reliable!

</div>

---

##  How to Run

### Prerequisites

You'll need two things installed on your computer:

1. **Bun** - A modern JavaScript runtime (think of it as a faster alternative to Node.js)
   - [Download Bun here](https://bun.sh)
   - Takes 2 minutes to install

2. **Git** - To download the project code
   - [Download Git here](https://git-scm.com)
   - Already have it? You're good to go!

### Step-by-Step Setup

#### Step 1️: Download the Project

Open your terminal (Command Prompt, PowerShell, or Terminal app) and run:

```bash
git clone https://github.com/crafter-station/pintel.git
cd pintel
```

This downloads the pintel code to your computer and moves you into the folder.

#### Step 2️: Install Dependencies

Still in the terminal, run:

```bash
bun install
```

This automatically downloads all the code libraries pintel needs to run. It takes about 1-2 minutes depending on your internet speed.

#### Step 3️: Set Up Your API Keys

The game needs access to AI models through Vercel's AI Gateway. Here's how to get set up:

Create a new file called `.env.local` in your project folder (the same folder as this README), and paste this inside:

```env
AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key-here
```

<details>
<summary>🔑 <strong>How to get an AI Gateway API key (click to expand)</strong></summary>

<br/>

It's free and only takes 5 minutes:

1. Go to [Vercel.com](https://vercel.com)
2. Create a free account or sign in
3. Click on your profile picture → Settings
4. Go to "Integrations" → "AI Gateway"
5. Create a new project (or use existing one)
6. Generate a new API key
7. Copy the key
8. Paste it into your `.env.local` file where it says `your-vercel-ai-gateway-key-here`

That's it! You now have access to GPT-4, Claude, Gemini, and Grok models.

</details>

#### Step 4️: Start the Game

In your terminal, run:

```bash
bun dev
```

You should see a message that says something like "✓ Ready on http://localhost:3000"

#### Step 5️: Play!

Open your web browser and go to:

```
http://localhost:3000
```

**Boom! 🎉** You now have pintel running on your computer! 

You'll see the game homepage. Click on any game mode tab at the top to start playing:
- **Human Play** - Draw and guess with AI
- **Human Judge** - Vote for the best AI art
- **Model Guess** - See if AI can guess your drawings
- **AI Duel** - Watch AI compete

Enjoy! 🤖

---

##  What to Expect When You Run It

When you open the game, you'll see:

1. **Home page** with a navigation menu
2. **Game mode tabs** at the top (Human Play, Human Judge, Model Guess, AI Duel)
3. **A drawing canvas** when it's time to draw
4. **Real-time results** showing AI responses and scores as they happen
5. **Gallery page** to browse all your past games
6. **Leaderboard page** showing how different AI models perform

The game works best in modern browsers like Chrome, Firefox, Safari, or Edge on desktop, tablet, or phone.

---

##  Other Useful Commands

If you need to do other things with the project:

```bash
bun build        # Build the app for production deployment
bun start        # Run the production version (after build)
bun lint         # Check code quality for errors
```

---

## Troubleshooting

**"bun: command not found"**
- Make sure you installed Bun from https://bun.sh

**"AI_GATEWAY_API_KEY is not set"**
- Check that your `.env.local` file is in the project root folder
- Make sure the filename is exactly `.env.local` (starts with a dot)
- Restart the dev server after creating the file (stop it and run `bun dev` again)

**"Page not loading at localhost:3000"**
- Wait 30 seconds for the dev server to fully start
- Check that your terminal doesn't show any red error messages
- Try a different browser or clear your browser cache

Still stuck? Check the terminal output for error messages - they usually tell you what's wrong!

---

<div align="center">

<br/>

**Made with ❤️ for the Vercel AI Gateway Hackathon**

<p><strong>Have fun playing with AI and discovering how different models think!</strong></p>

</div>
