import { 
  CloudAdapter, 
  ConfigurationServiceClientCredentialFactory,
  TurnContext,
  MessageFactory,
  CardFactory,
  ActionTypes
} from 'botbuilder';

class TeamsBot {
  constructor(ragService, aiProvider) {
    this.ragService = ragService;
    this.ai = aiProvider;
    
    // Bot configuration
    const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
      MicrosoftAppId: process.env.MICROSOFT_APP_ID,
      MicrosoftAppPassword: process.env.MICROSOFT_APP_PASSWORD,
      MicrosoftAppType: process.env.MICROSOFT_APP_TYPE || 'MultiTenant',
      MicrosoftAppTenantId: process.env.MICROSOFT_APP_TENANT_ID
    });

    this.adapter = new CloudAdapter(credentialsFactory);

    // Error handler
    this.adapter.onTurnError = async (context, error) => {
      console.error('Teams Bot Error:', error);
      await context.sendActivity(MessageFactory.text('Sorry, I encountered an error. Please try again.'));
    };

    // Set up bot logic
    this.adapter.processActivity = this.processActivity.bind(this);
  }

  async processActivity(req, res) {
    await this.adapter.process(req, res, async (context) => {
      if (context.activity.type === 'message') {
        await this.handleMessage(context);
      } else if (context.activity.type === 'membersAdded') {
        await this.handleMembersAdded(context);
      }
    });
  }

  async handleMessage(context) {
    try {
      const userMessage = context.activity.text?.trim();
      
      if (!userMessage) {
        await context.sendActivity(MessageFactory.text('Please send me a message!'));
        return;
      }

      // Show typing indicator
      await context.sendActivity(MessageFactory.text('🤔 Searching...'));

      // Get user context from Teams
      const userContext = this.extractUserContext(context);
      
      // Process query using RAG service with enterprise optimizations
      const result = await this.ragService.processQuery(userMessage, context.activity.conversation.id, {
        contextLimit: 5, // Increased for enterprise datasets
        threshold: 0.6, // Higher threshold for better relevance
        userContext
      });

      // Create response with user cards if relevant users found
      if (result.relevantUsers && result.relevantUsers.length > 0) {
        // Send main response
        await context.sendActivity(MessageFactory.text(result.response));

        // Send user cards
        const userCards = this.createUserCards(result.relevantUsers);
        await context.sendActivity(MessageFactory.carousel(userCards));
      } else {
        // Send just the text response
        await context.sendActivity(MessageFactory.text(result.response));
      }

      // Add quick action buttons for common queries
      const suggestedActions = this.createSuggestedActions();
      await context.sendActivity(MessageFactory.suggestedActions(suggestedActions, 'You can also try:'));

    } catch (error) {
      console.error('Message handling error:', error);
      await context.sendActivity(MessageFactory.text('Sorry, I had trouble processing your request. Please try again.'));
    }
  }

  async handleMembersAdded(context) {
    const welcomeText = `
🤖 **Welcome to Synapse AI!**

I can help you with:
• 👥 Find colleagues and team members
• 🔍 Search by skills and expertise  
• 📋 Get contact information
• 🏢 Browse by department or role

Try asking me:
- "Who works in engineering?"
- "Find someone with Python skills"
- "Tell me about John Doe"
- "Who can help with React development?"

Just type your question and I'll search our directory!
    `;

    const membersAdded = context.activity.membersAdded;
    for (const member of membersAdded) {
      if (member.id !== context.activity.recipient.id) {
        await context.sendActivity(MessageFactory.text(welcomeText));
      }
    }
  }

  extractUserContext(context) {
    const activity = context.activity;
    return {
      userId: activity.from.id,
      userName: activity.from.name,
      tenantId: activity.channelData?.tenant?.id,
      teamId: activity.channelData?.team?.id,
      channelId: activity.conversation.id,
      conversationType: activity.conversation.conversationType
    };
  }

  createUserCards(users) {
    return users.map(user => {
      const card = {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'auto',
                  items: [
                    {
                      type: 'Image',
                      url: user.avatar || 'https://via.placeholder.com/50x50.png?text=' + (user.name ? user.name.charAt(0) : 'U'),
                      size: 'Small',
                      style: 'Person'
                    }
                  ]
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: user.name || 'Unknown User',
                      weight: 'Bolder',
                      size: 'Medium'
                    },
                    {
                      type: 'TextBlock',
                      text: user.role || 'Role not specified',
                      color: 'Accent',
                      spacing: 'None'
                    },
                    {
                      type: 'TextBlock',
                      text: user.department || 'Department not specified',
                      color: 'Default',
                      size: 'Small',
                      spacing: 'None'
                    }
                  ]
                }
              ]
            },
            {
              type: 'TextBlock',
              text: user.skills ? `**Skills:** ${user.skills}` : '',
              wrap: true,
              size: 'Small',
              spacing: 'Medium'
            },
            {
              type: 'TextBlock',
              text: user.bio || '',
              wrap: true,
              size: 'Small',
              maxLines: 2
            }
          ],
          actions: [
            {
              type: 'Action.OpenUrl',
              title: 'Contact',
              url: user.email ? `mailto:${user.email}` : '#'
            },
            {
              type: 'Action.Submit',
              title: 'More Info',
              data: {
                action: 'userDetails',
                userId: user.id
              }
            }
          ]
        }
      };

      return CardFactory.adaptiveCard(card.content);
    });
  }

  createSuggestedActions() {
    return [
      'Who works in engineering?',
      'Find Python developers',
      'Show me managers',
      'List all departments'
    ];
  }

  async handleUserDetailsAction(context, userData) {
    try {
      const userId = userData.userId;
      
      // Get detailed user information
      const userQuery = await this.ragService.db.query('SELECT * FROM users WHERE id = $1', [userId]);
      const user = userQuery.rows[0];

      if (!user) {
        await context.sendActivity(MessageFactory.text('User not found.'));
        return;
      }

      const detailCard = this.createDetailedUserCard(user);
      await context.sendActivity(MessageFactory.attachment(detailCard));

    } catch (error) {
      console.error('User details error:', error);
      await context.sendActivity(MessageFactory.text('Sorry, I couldn\'t fetch the user details.'));
    }
  }

  createDetailedUserCard(user) {
    const card = {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        type: 'AdaptiveCard',
        version: '1.4',
        body: [
          {
            type: 'Container',
            style: 'accent',
            items: [
              {
                type: 'ColumnSet',
                columns: [
                  {
                    type: 'Column',
                    width: 'auto',
                    items: [
                      {
                        type: 'Image',
                        url: user.avatar || 'https://via.placeholder.com/80x80.png?text=' + user.name.charAt(0),
                        size: 'Medium',
                        style: 'Person'
                      }
                    ]
                  },
                  {
                    type: 'Column',
                    width: 'stretch',
                    items: [
                      {
                        type: 'TextBlock',
                        text: user.name,
                        weight: 'Bolder',
                        size: 'Large',
                        color: 'Light'
                      },
                      {
                        type: 'TextBlock',
                        text: user.role || 'Role not specified',
                        color: 'Light',
                        spacing: 'None'
                      },
                      {
                        type: 'TextBlock',
                        text: user.department || 'Department not specified',
                        color: 'Light',
                        size: 'Small',
                        spacing: 'None'
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            type: 'FactSet',
            facts: [
              ...(user.email ? [{ title: 'Email:', value: user.email }] : []),
              ...(user.phone ? [{ title: 'Phone:', value: user.phone }] : []),
              ...(user.location ? [{ title: 'Location:', value: user.location }] : []),
              ...(user.skills ? [{ title: 'Skills:', value: user.skills }] : [])
            ]
          },
          ...(user.bio ? [{
            type: 'TextBlock',
            text: '**About**',
            weight: 'Bolder',
            spacing: 'Medium'
          }, {
            type: 'TextBlock',
            text: user.bio,
            wrap: true
          }] : [])
        ],
        actions: [
          ...(user.email ? [{
            type: 'Action.OpenUrl',
            title: '✉️ Send Email',
            url: `mailto:${user.email}`
          }] : []),
          ...(user.phone ? [{
            type: 'Action.OpenUrl',
            title: '📞 Call',
            url: `tel:${user.phone}`
          }] : [])
        ]
      }
    };

    return CardFactory.adaptiveCard(card.content);
  }

  // Middleware to handle adaptive card actions
  async handleAdaptiveCardAction(context, action) {
    if (action.data && action.data.action === 'userDetails') {
      await this.handleUserDetailsAction(context, action.data);
    }
  }

  getMiddleware() {
    return (req, res) => this.processActivity(req, res);
  }
}

export default TeamsBot;
