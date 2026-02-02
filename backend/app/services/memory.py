from langchain_classic.memory import ConversationBufferMemory

sessions = {}

def get_memory(session_id: str):
    if session_id not in sessions:
        sessions[session_id] = ConversationBufferMemory(return_messages=True)
    return sessions[session_id]
