import json
from typing import Optional
from datetime import datetime

class TicketRepository:
    def __init__(self, filepath: Optional[str] = None):
        self.tickets = []
        self.messages = {}
        if filepath:
            try:
                with open(filepath) as json_file:
                    data = json.load(json_file)
                    self.tickets = data["tickets"]
                    for message in data["messages"]:
                        self.messages[message["id"]] = message
            except FileNotFoundError:
                pass

    def set_mock_data(self, mock_data):
        self.tickets = mock_data["tickets"]
        self.messages = {msg["id"]: msg for msg in mock_data["messages"]}

    def get_tickets(self, page: int = 1, limit: int = 20, username: str = None, status: str = None, start_date: str = None, end_date: str = None) -> list[dict]:
        filtered_tickets = self.tickets

        if username:
            filtered_tickets = [ticket for ticket in filtered_tickets if username.lower() in self.messages[ticket["msg_id"]]["author"]["name"].lower()]

        if status:
            filtered_tickets = [ticket for ticket in filtered_tickets if ticket['status'].lower() == status.lower()]

        if start_date and end_date:
            start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
            end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
            filtered_tickets = [
                ticket for ticket in filtered_tickets
                if start_date_obj <= datetime.strptime(ticket['timestamp'].split(' ')[0], "%Y-%m-%d") <= end_date_obj
            ]
        
        for ticket in filtered_tickets:
            message = self.messages.get(ticket["msg_id"])
            if message:
                ticket["message"] = message

        start = (page - 1) * limit
        end = start + limit
        return filtered_tickets[start:end]
    
    def get_ticket_with_message(self, ticket_id: str) -> dict:
        ticket = next((t for t in self.tickets if t["id"] == ticket_id), None)
        if ticket:
            message = self.messages.get(ticket["msg_id"])
            ticket["message"] = message
        return ticket

    def delete_ticket(self, ticket_id: str) -> bool:
        original_count = len(self.tickets)
        self.tickets = [ticket for ticket in self.tickets if ticket['id'] != ticket_id]
        return len(self.tickets) < original_count

    def close_ticket(self, ticket_id: str) -> bool:
        ticket = next((t for t in self.tickets if t["id"] == ticket_id), None)
        if ticket:
            ticket['status'] = 'closed'
            return True
        return False

    def get_message(self, msg_id: str) -> dict:
        return self.messages.get(msg_id)