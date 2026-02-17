import { Component, inject, signal, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../pages/login/auth.service';

interface ChatMessage {
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  firstName?: string;   // 👈 add this
  link?: string;
  actionText?: string;
}


@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css']
})
export class ChatWidgetComponent implements OnInit, AfterViewChecked {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild('chatMessages') private chatMessagesRef!: ElementRef;

  isOpen = signal(false);
  message = '';
  isLoading = signal(false);
  
  // Initialize empty, we will fill this in ngOnInit
  messages = signal<ChatMessage[]>([]);

  quickReplies = [
    'My Application Status',
    'Outstanding Balance',
    'How to apply?',
    'Contact Support'
  ];

  // 🟢 NEW: Initialize the greeting with the user's name
ngOnInit() {
  const user = this.authService.currentUserSignal();
  const firstName = user?.fullName ? user.fullName.split(' ')[0] : 'there';

  const greeting = `
    Hi <span class="user-name">${firstName}</span>! 
    I can help you check your <b>Loan Status</b>, 
    calculate <b>EMI</b>, or raise a <b>Ticket</b>.
  `;

  this.messages.set([
    { 
      text: greeting,
      sender: 'bot', 
      timestamp: new Date()
    }
  ]);
}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen.update(val => !val);
  }

  sendQuickReply(text: string) {
    this.message = text;
    this.sendMessage();
  }

  sendMessage() {
    if (!this.message.trim()) return;

    const userMsgText = this.message;
    
    // Add User Message
    this.messages.update(msgs => [...msgs, { text: userMsgText, sender: 'user', timestamp: new Date() }]);
    
    this.message = '';
    this.isLoading.set(true);

    this.http.post<any>('http://localhost:3000/api/chatbot/chat', 
      { message: userMsgText },
      { headers: { Authorization: `Bearer ${localStorage.getItem('loanApp_token')}` } }
    ).subscribe({
      next: (res) => {
        const botMsg: ChatMessage = {
          text: res.text || res.response,
          sender: 'bot',
          timestamp: new Date(),
          link: res.link,
          actionText: res.actionText
        };
        this.messages.update(msgs => [...msgs, botMsg]);
        this.isLoading.set(false);
      },
      error: () => {
        this.messages.update(msgs => [...msgs, { text: "I'm having trouble connecting right now.", sender: 'bot', timestamp: new Date() }]);
        this.isLoading.set(false);
      }
    });
  }

  navigate(link: string) {
    this.router.navigateByUrl(link);
    this.isOpen.set(false);
  }

  private scrollToBottom(): void {
    try {
      this.chatMessagesRef.nativeElement.scrollTop = this.chatMessagesRef.nativeElement.scrollHeight;
    } catch(err) { }
  }
}