const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface TransferRequest {
  amount: number;
  number_phone: string;
}

export interface TransferResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    id: string;
    amount: string;
    number_phone: string;
    type: string;
    status: 'complete' | 'pending' | 'failed';
    at_created: string;
  };
}

export interface TransactionStatusResponse {
  status: 'success' | 'error';
  message: string;
  data?: {
    id: string;
    amount: string;
    number_phone: string;
    type: string;
    status: 'complete' | 'pending' | 'failed';
    at_created: string;
  };
}

export const gibrapay = {
  async transfer(request: TransferRequest): Promise<TransferResponse> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/gibrapay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'transfer',
          amount: request.amount,
          number_phone: request.number_phone,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('GibraPay transfer error:', error);
      return {
        status: 'error',
        message: 'Erro de conexão com o servidor de pagamento',
      };
    }
  },

  async checkTransactionStatus(transactionId: string): Promise<TransactionStatusResponse> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/gibrapay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'status',
          transactionId,
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('GibraPay status check error:', error);
      return {
        status: 'error',
        message: 'Erro ao verificar status da transação',
      };
    }
  },

  async getTransactions(): Promise<any> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/gibrapay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'transactions',
        }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('GibraPay get transactions error:', error);
      return {
        status: 'error',
        message: 'Erro ao buscar transações',
      };
    }
  },
};
