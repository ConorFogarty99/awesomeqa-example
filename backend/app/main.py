from app.repositories.ticket_repository import TicketRepository
import uvicorn
from fastapi import Depends, FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TICKET_FILEPATH = "../data/awesome_tickets.json"

# Singleton pattern for TicketRepository
# So once instance of ticket_repository exists in
# life cycle of a server instance 
ticket_repository_instance = None

def get_ticket_repository() -> TicketRepository:
    global ticket_repository_instance
    if ticket_repository_instance is None:
        ticket_repository_instance = TicketRepository(filepath=TICKET_FILEPATH)
    return ticket_repository_instance

@app.get("/healthz")
async def root():
    return "OK"

@app.get("/tickets")
async def get_tickets(
        page: int = 1, 
        limit: int = 20,
        username: str = None,
        status: str = None,
        start_date: str = None,
        end_date: str = None,
        ticket_repository: TicketRepository = Depends(get_ticket_repository),
    ):
    tickets_slice = ticket_repository.get_tickets(page=page, limit=limit, username=username, status=status, start_date=start_date, end_date=end_date)
    total_count = len(ticket_repository.tickets)
    return JSONResponse({"tickets": tickets_slice, "total": total_count}, status_code=200)

@app.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, ticket_repository: TicketRepository = Depends(get_ticket_repository)):
    ticket = ticket_repository.get_ticket_with_message(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@app.delete("/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str, ticket_repository: TicketRepository = Depends(get_ticket_repository)):
    success = ticket_repository.delete_ticket(ticket_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": "Ticket deleted"}

@app.put("/tickets/{ticket_id}/close")
async def close_ticket(ticket_id: str, ticket_repository: TicketRepository = Depends(get_ticket_repository)):
    ticket = ticket_repository.get_ticket_with_message(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket_updated = ticket_repository.close_ticket(ticket_id)
    if not ticket_updated:
        raise HTTPException(status_code=500, detail="Failed to close ticket")

    return {"message": "Ticket closed"}

@app.get("/messages/{msg_id}")
async def get_message(msg_id: str, ticket_repository: TicketRepository = Depends(get_ticket_repository)):
    message = ticket_repository.get_message(msg_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return message

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=5001, reload=True)
