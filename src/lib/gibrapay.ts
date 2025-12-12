const API_KEY = "b3b33cba8a903626a015d592754f1dcec756e9fbb12d411516f4a79b04aba8923ebb6396da29e61c899154ab005aaf056961b819c263e1ec5d88c60b9cae6aba";
const WALLET_ID = "50c282d1-843f-4b9c-a287-2140e9e8d94b";
const BASE_URL = "https://gibrapay.online";

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
      const response = await fetch(`${BASE_URL}/v1/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-Key': API_KEY,
        },
        body: JSON.stringify({
          wallet_id: WALLET_ID,
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
      const response = await fetch(`${BASE_URL}/transaction/status/${transactionId}`, {
        method: 'GET',
        headers: {
          'API-Key': API_KEY,
        },
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
      const response = await fetch(`${BASE_URL}/v1/transactions/${WALLET_ID}`, {
        method: 'GET',
        headers: {
          'API-Key': API_KEY,
        },
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
