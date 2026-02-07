import asyncio
from dedalus_labs import AsyncDedalus, DedalusRunner
from dotenv import load_dotenv
import os

# async def main():
#     load_dotenv()
#     client = AsyncDedalus(api_key=os.getenv("DEDALUS_KEY"))
#     runner = DedalusRunner(client)

#     response = await runner.run(
#         input="Hello, what can you do?",
#         model="anthropic/claude-opus-4-5",
#     )
#     print(response.final_output)

# asyncio.run(main())

class Agent:
   
    async def agent_conversation(self, interest1: str, interest2: str) -> str:
        load_dotenv()
        client = AsyncDedalus(api_key=os.getenv("DEDALUS_KEY"))
        runner1 = DedalusRunner(client)
        runner2 = DedalusRunner(client)

        shared_goal = "Reach consensus on one question to ask both users based on their interests (fragments of their lives) to help them network with each other in real life. Make sure the question is normal and not too weirdly specific. Example: \"What is your favorite memory involving cats?\""

        system_instructions = (
            "You are two agents collaborating. Hold a short conversation and converge on ONE final question. "
            "When you agree, output exactly one line that starts with 'CONSENSUS:' followed by the question."
        )

        shared_interests = f"User 1 is interested in {interest1}. User 2 is interested in {interest2}."
        
        message = (
            f"{system_instructions}\n\n"
            f"Shared goal: {shared_goal}\n"
            f"Shared interests: {shared_interests}\n\n"
            "Agent 1, propose a candidate question and rationale."
        )

        last_agent1 = ""
        last_agent2 = ""

        for _ in range(4):
            response1 = await runner1.run(
                input=message,
                model="anthropic/claude-opus-4-5",
            )
            last_agent1 = response1.final_output
            print(f"Agent 1: {last_agent1}")

            if "CONSENSUS:" in last_agent1:
                return last_agent1.split("CONSENSUS:")[1].strip()

            response2 = await runner2.run(
                input=(
                    f"{system_instructions}\n\n"
                    f"Shared goal: {shared_goal}\n"
                    f"Shared interests: {shared_interests}\n\n"
                    f"Agent 1 said: {last_agent1}\n\n"
                    "Agent 2, respond and refine toward consensus."
                ),
                model="anthropic/claude-opus-4-5",
            )
            last_agent2 = response2.final_output
            print(f"Agent 2: {last_agent2}")

            if "CONSENSUS:" in last_agent2:
                return last_agent2.split("CONSENSUS:")[1].strip()

            message = (
                f"{system_instructions}\n\n"
                f"Shared goal: {shared_goal}\n"
                f"Shared interests: {shared_interests}\n\n"
                f"Agent 2 said: {last_agent2}\n\n"
                "Agent 1, propose an improved question and aim for consensus."
            )      

