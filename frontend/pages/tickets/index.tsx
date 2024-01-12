import React, { useState, useEffect } from 'react';
import { 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Modal, Box, Typography, Avatar, Button, IconButton, TablePagination, List, ListItem, ListItemText
} from '@mui/material';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';

const truncateMessage = (message, limit = 20) => {
    const words = message.split(' ');
    if (words.length > limit) {
      return words.slice(0, limit).join(' ') + '...';
    }
    return message;
};

const TicketModal = ({ open, onClose, ticket, contextMessages, onRemoveTicket, onConfirmRemoveTicket, getStatusStyles }) => {
    if (!ticket || !ticket.message || !ticket.message.author) return null;
  
    const originalMessageId = ticket.msg_id;
    const originalMessage = contextMessages.find(
        (msg) => msg.id === originalMessageId
    );
  
    const modalStyle = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '75%',
      bgcolor: 'background.paper',
      boxShadow: 24,
      p: 4,
      overflow: 'auto',
      maxHeight: '90%',
    };
  
    const getBackgroundColor = (msgId) => {
      return msgId === originalMessageId ? '#656565' : '#282828';
    };
  
    return (
        <Modal open={open} onClose={onClose} aria-labelledby="ticket-modal-title">
            <Box sx={modalStyle}>
            {/* Header with Ticket ID */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: "#121212", p: 2 }}>
                <Typography id="ticket-modal-title" variant="h6" component="h2" color="white">
                    Ticket ID: {ticket.id}
                </Typography>
                <Box sx={getStatusStyles(ticket.status)}>
                    {ticket.status}
                </Box>
            </Box>

  
            {/* Original Message Section */}
            <Box sx={{ bgcolor: getBackgroundColor(originalMessageId), p: 2, my: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar src={ticket.message.author.avatar_url} alt={ticket.message.author.name} sx={{ marginRight: 2 }} />
                    <Typography variant="subtitle2" color="white"><strong>{ticket.message.author.name}</strong></Typography>
                </Box>
                <Typography variant="body1" color="white">{ticket.message.content}</Typography>
                <Typography variant="caption" color="white">{new Date(ticket.timestamp).toLocaleString()}</Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        startIcon={<OpenInNewOutlinedIcon />}
                        onClick={() => window.open(ticket.message.msg_url, '_blank')}
                        sx={{ mt: 2 }}
                    >
                        View in Discord
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<DeleteIcon />}
                        onClick={() => {
                            onConfirmRemoveTicket(ticket.id);
                        }}
                        sx={{ mt: 2 }}
                        color="error"
                    >
                    Remove Ticket
                    </Button>
                </Box>
            </Box>
    
            {/* Context Messages List */}
            <List>
            {contextMessages.map((msg) => (
                <ListItem 
                key={msg.id} 
                sx={{ 
                    bgcolor: getBackgroundColor(msg.id), 
                    mb: 1, 
                    borderRadius: 1, 
                    padding: 2,
                }}
                >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Avatar src={msg.author?.avatar_url} alt={msg.author?.name} sx={{ marginRight: 2 }} />
                    {/* Use a Typography component for the author's name */}
                    <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {msg.author?.name}
                    </Typography>
                    <Typography variant="body2" color="white">
                        {msg.content}
                    </Typography>
                    </Box>
                    <IconButton 
                    href={msg.msg_url} 
                    target="_blank" 
                    sx={{ color: 'white' }}
                    >
                    <OpenInNewOutlinedIcon />
                    </IconButton>
                </Box>
                </ListItem>
            ))}
            </List>
            </Box>
    </Modal>
    );
};

const TicketsPage = () => {
    const [tickets, setTickets] = useState([]);
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [ticketDetails, setTicketDetails] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [openModal, setOpenModal] = useState(false);
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [ticketToDelete, setTicketToDelete] = useState(null);
    const [contextMessages, setContextMessages] = useState([]);
    const [totalNumberOfTickets, setTotalNumberOfTickets] = useState(0);

    const fetchTickets = async (pageParam = page, rowsPerPageParam = rowsPerPage) => {
        setLoading(true);
        const url = `http://localhost:5001/tickets?page=${pageParam + 1}&limit=${rowsPerPageParam}`;
      
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setTotalNumberOfTickets(data.total); // Update the total number of tickets
      
          // Fetch messages for each ticket
          const messages = await Promise.all(
            data.tickets.map(ticket =>
              fetch(`http://localhost:5001/messages/${ticket.msg_id}`).then(res => res.json())
            )
          );
      
          const ticketsWithMessages = data.tickets.map((ticket, index) => ({
            ...ticket,
            message: messages[index], // Now "messages" is defined
          }));
      
          setTickets(ticketsWithMessages);
        } catch (error) {
          setError('Failed to fetch tickets');
          console.error('Error fetching tickets:', error);
        } finally {
          setLoading(false);
        }
      };

    useEffect(() => {
        fetchTickets();
    }, [page, rowsPerPage]);

    useEffect(() => {
        if (selectedTicketId) {
            setLoading(true);
            fetch(`http://localhost:5001/tickets/${selectedTicketId}`)
            .then(response => response.json())
            .then(async (ticket) => {
                const contextMessages = await fetchContextMessages(ticket.context_messages);
                setTicketDetails({ ...ticket, contextMessages });
                setLoading(false);
            })
            .catch(err => {
                setError('Failed to fetch ticket details');
                setLoading(false);
            });
        }
    }, [selectedTicketId]);

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
        fetchTickets(newPage, rowsPerPage);
    };
    
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
        fetchTickets(0, event.target.value);
    };
    
    const handleOpenModal = (ticketId) => {
        setSelectedTicketId(ticketId);
        setOpenModal(true);
    };
    
    const handleCloseModal = () => {
        setOpenModal(false);
    };

    const handleRemoveTicket = async (ticketId) => {
        try {
            const response = await fetch(`http://localhost:5001/tickets/${ticketId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete the ticket');
            }
            await fetchTickets();

            setSelectedTicketId(null);
            setTicketDetails(null);
            setOpenModal(false);
        } catch (error) {
            setError(error.message);
            console.error('Error deleting ticket:', error);
        }
    };

    const handleConfirmDelete = (ticketId) => {
        setTicketToDelete(ticketId);
        setOpenConfirmDialog(true);
    };
    
    const handleDelete = async () => {
        if (ticketToDelete) {
            await handleRemoveTicket(ticketToDelete);
            setOpenConfirmDialog(false);
            setOpenModal(false);
        }
    };
    
    const handleCloseConfirmDialog = () => {
        setOpenConfirmDialog(false);
    };

    const handleRowClick = async (ticketId) => {
        const ticketResponse = await fetch(`http://localhost:5001/tickets/${ticketId}`);
        const fullTicket = await ticketResponse.json();
      
        if (fullTicket && fullTicket.message && fullTicket.message.author) {
            setSelectedTicketId(fullTicket.id);
            setTicketDetails(fullTicket);
            const fetchedContextMessages = await fetchContextMessages(fullTicket.context_messages);
            setContextMessages(fetchedContextMessages);
            setOpenModal(true);
        } else {
            console.error('Ticket data is incomplete', fullTicket);
        }
    };

    const fetchContextMessages = async (contextMessageIds) => {
        const messagePromises = contextMessageIds.map(msgId => 
            fetch(`http://localhost:5001/messages/${msgId}`).then(res => res.json())
        );
        return Promise.all(messagePromises);
    };

    const getStatusStyles = (status) => {
        return {
            bgcolor: status.toLowerCase() === 'open' ? 'red' : 'green',
            color: 'white',
            borderRadius: '16px',
            padding: '3px 10px',
            display: 'inline-block',
            textTransform: 'capitalize',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            ml: 2
        };
      };

    const renderTicketsTable = () => {
        if (loading) return <Typography>Loading...</Typography>;
        if (!loading && tickets.length === 0) return <Typography>No tickets to display</Typography>;

        return (
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="tickets table">
            <TableHead>
                <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Content</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {tickets.map((ticket) => (
                    <TableRow
                        key={ticket.id}
                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        hover
                        onClick={() => handleRowClick(ticket.id)}
                        style={{ cursor: 'pointer' }}
                    >
                        <TableCell component="th" scope="row">
                            <Box sx={getStatusStyles(ticket.status)}>{ticket.status}</Box>
                        </TableCell>
                        <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar src={ticket.message.author.avatar_url} alt={ticket.message.author.name} sx={{ marginRight: 2 }} />
                                <Typography variant="subtitle2"><strong>{ticket.message.author.name}</strong></Typography>
                            </Box>
                        </TableCell>
                        <TableCell>{truncateMessage(ticket.message.content)}</TableCell>
                        <TableCell>{new Date(ticket.timestamp).toLocaleString()}</TableCell>
                        <TableCell>
                            {/* Do not add the click event to the delete icon cell */}
                            <IconButton href={ticket.message.msg_url} target="_blank">
                                <OpenInNewOutlinedIcon />
                            </IconButton>
                            <IconButton onClick={(event) => {
                                event.stopPropagation();
                                handleConfirmDelete(ticket.id);
                                }}>
                                <DeleteIcon sx={{ color:'white'}}/>
                            </IconButton>
                        </TableCell>
                    </TableRow>
                    ))}
                </TableBody>
            </Table>
            <TablePagination
                component="div"
                count={totalNumberOfTickets}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
        </TableContainer>
        )
    };

    return (
        <Box sx={{ width: '100%' }}>
            {/* Search and filter bar */}
            <Box sx={{ backgroundColor: 'blue', display: 'flex', alignItems: 'center', padding: 2 }}>
                {/* Search and filter elements */}
                <IconButton>
                <SearchIcon />
                </IconButton>
                {/* Other filter elements */}
            </Box>
        
            {/* Main table */}
            {renderTicketsTable()}
        
            {/* Ticket details modal */}
            <TicketModal
                open={openModal}
                onClose={handleCloseModal}
                ticket={ticketDetails}
                contextMessages={contextMessages}
                onRemoveTicket={handleRemoveTicket}
                onConfirmRemoveTicket={handleConfirmDelete}
                getStatusStyles={getStatusStyles}
            />
            {/* Confirmation Dialog for Deleting a Ticket */}
            <Dialog
            open={openConfirmDialog}
            onClose={handleCloseConfirmDialog}
            aria-labelledby="alert-dialog-title"
            >
            <DialogTitle id="alert-dialog-title">
                {"Are you sure you want to delete this ticket?"}
            </DialogTitle>
            <DialogActions>
                <Button onClick={handleCloseConfirmDialog} color="primary">
                Cancel
                </Button>
                <Button onClick={handleDelete} color="primary" autoFocus>
                Delete
                </Button>
            </DialogActions>
            </Dialog>
        </Box>
      );
    };

export default TicketsPage;