import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage,AIMessage,HumanMessage
from app.config import SYSTEM_PROMPT

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0.3,
    api_key=os.getenv("GOOGLE_API_KEY"),
)

def ask_gemini(user_text: str, memory):
    memory.chat_memory.add_user_message(user_text)

    messages = [SystemMessage(content=SYSTEM_PROMPT)]
    for msg in memory.chat_memory.messages:
        if msg.type == "human":
            messages.append(HumanMessage(content=msg.content))
        elif msg.type == "ai":
            messages.append(AIMessage(content=msg.content))

    response = llm.invoke(messages)
    ai_text = response.content

    memory.chat_memory.add_ai_message(ai_text)
    return ai_text


