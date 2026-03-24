import { useState, useEffect, useCallback } from 'react';
import { useDelegation } from '../../context/DelegationContext';
import { API_BASE_URL } from '../../config';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

export type Address = `0x${string}`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'progress' | 'swap_init';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  swapData?: Record<string, any>;
}

export interface Asset {
  symbol: string;
  name: string;
  balance: string;
  valueUsd: string;
  icon: string;
  color?: string;
  address?: Address;
}

const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006" as Address;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export const useVaultLogic = () => {
  const { smartAccountAddress, delegationPayload } = useDelegation();
  // --- Portfolio State ---
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [dailyChange] = useState(4.2);
  const [assets, setAssets] = useState<Asset[]>([
    { symbol: 'USDC', name: 'USD Coin', balance: '0.00', valueUsd: '0.00', icon: 'monetization_on', color: 'primary', address: USDC_ADDRESS },
    { symbol: 'WETH', name: 'Wrapped Ether', balance: '0.00', valueUsd: '0.00', icon: 'currency_exchange', color: 'on-surface', address: WETH_ADDRESS },
    { symbol: 'ETH', name: 'Ethereum', balance: '0.00', valueUsd: '0.00', icon: 'account_balance_wallet', color: 'secondary' },
  ]);

  // --- Identity ---
  const userAddress = smartAccountAddress || '0x0000000000000000000000000000000000000000'; 

  const storageKey = `chat_messages_${userAddress}`;

  const fetchBalances = useCallback(async () => {
    if (!smartAccountAddress || smartAccountAddress === '0x0000000000000000000000000000000000000000') return;

    try {
      const abi = [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] }];

      // Fetch ETH Balance
      const ethBalance = await publicClient.getBalance({ address: smartAccountAddress as Address });
      const ethFormatted = (Number(ethBalance) / 1e18).toString();
      
      // Fetch USDC Balance (6 decimals)
      const usdcBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi,
        functionName: 'balanceOf',
        args: [smartAccountAddress as Address],
      }) as bigint;
      const usdcFormatted = (Number(usdcBalance) / 1e6).toString();

      // Fetch WETH Balance (18 decimals)
      const wethBalance = await publicClient.readContract({
        address: WETH_ADDRESS,
        abi,
        functionName: 'balanceOf',
        args: [smartAccountAddress as Address],
      }) as bigint;
      const wethFormatted = (Number(wethBalance) / 1e18).toString();

      // Simple mock prices
      const ethPrice = 3500;
      const usdcPrice = 1;
      
      const ethValueUsd = (parseFloat(ethFormatted) * ethPrice).toFixed(2);
      const usdcValueUsd = (parseFloat(usdcFormatted) * usdcPrice).toFixed(2);
      const wethValueUsd = (parseFloat(wethFormatted) * ethPrice).toFixed(2);

      const totalValue = parseFloat(ethValueUsd) + parseFloat(usdcValueUsd) + parseFloat(wethValueUsd);
      setPortfolioValue(totalValue);

      setAssets([
        { symbol: 'USDC', name: 'USD Coin', balance: `${parseFloat(usdcFormatted).toLocaleString()} USDC`, valueUsd: `$${usdcValueUsd}`, icon: 'monetization_on', color: 'primary', address: USDC_ADDRESS },
        { symbol: 'WETH', name: 'Wrapped Ether', balance: `${parseFloat(wethFormatted).toFixed(4)} WETH`, valueUsd: `$${wethValueUsd}`, icon: 'currency_exchange', color: 'on-surface', address: WETH_ADDRESS },
        { symbol: 'ETH', name: 'Ethereum', balance: `${parseFloat(ethFormatted).toFixed(4)} ETH`, valueUsd: `$${ethValueUsd}`, icon: 'account_balance_wallet', color: 'secondary' },
      ]);
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  }, [smartAccountAddress]);

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchBalances]);

  // --- Chat State Persistence ---
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = sessionStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [
      { role: 'assistant', content: 'Hello! I am your DeFi Swap Assistant. How can I help you today?', type: 'text' }
    ];
  });

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingSwap, setPendingSwap] = useState<Record<string, any> | null>(null);

  // Save messages whenever they change
  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  const clearMessages = () => {
    const initialMessage: Message = { 
      role: 'assistant', 
      content: 'Hello! I am your DeFi Swap Assistant. How can I help you today?', 
      type: 'text' 
    };
    setMessages([initialMessage]);
    setPendingSwap(null);
    sessionStorage.removeItem(storageKey);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const currentMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(currentMessages);
    setInputValue('');
    setIsTyping(true);

    try {
      const systemContext = `The user is currently logged in with address: ${userAddress}. 
Current Portfolio Value: $${portfolioValue.toFixed(2)}.
Available Assets: ${assets.map(a => `${a.balance} (${a.symbol})`).join(', ')}.`;
      
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[SYSTEM CONTEXT: ${systemContext}] 

 User Message: ${text}`,
          history: currentMessages.map(m => ({ role: m.role, content: m.content }))
        }),
      });

      const data = await response.json();

      if (data.success) {
        const reply = data.reply;
        const jsonMatch = reply.match(/```json\n([\s\S]*?)\n```/);
        
        const assistantMsg: Message = { 
          role: 'assistant', 
          content: reply.replace(/```json[\s\S]*?```/, '').trim(),
          type: 'text'
        };

        if (jsonMatch) {
          try {
            const parsedData = JSON.parse(jsonMatch[1]);
            
            // Ensure swapData is a complete JSON for the payload
            const completeSwapData = {
              ...parsedData,
              delegator: userAddress,
              delegation: delegationPayload || { salt: '0', caveats: [] }
            };
            
            setPendingSwap(completeSwapData);
            assistantMsg.type = 'swap_init';
            assistantMsg.swapData = completeSwapData;
          } catch (e) {
            console.error("Failed to parse swap JSON", e);
          }
        }

        setMessages(prev => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message}`,
        type: 'text'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const executeSwap = async () => {
    if (!pendingSwap) return;

    if (!delegationPayload) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Error: No delegation found. Please grant permissions in the Agent Permissions page first.',
        type: 'text'
      }]);
      return;
    }

    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: 'Executing swap transaction...', 
      type: 'progress' 
    }]);

    try {
      // Use delegationPayload.delegator as the source of truth for the SA address
      const requestBody = {
        ...pendingSwap,
        delegation: delegationPayload,
        delegator: delegationPayload.delegator 
      } as Record<string, any>;

      console.log("🚀 [useVaultLogic] Dispatching swap request to backend...");
      console.log("📦 Full Payload:", requestBody);

      const response = await fetch(`${API_BASE_URL}/api/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ [useVaultLogic] Backend execution successful:", data.transactionHash);
        
        const explorerBase = requestBody.chain.includes('base') 
            ? 'https://sepolia.basescan.org/tx/' 
            : 'https://celoscan.io/tx/';
        const explorerUrl = `${explorerBase}${data.transactionHash}`;

        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `✅ Swap successful! 

Transaction Hash: ${data.transactionHash}

Expected Amount Out: ${data.quote?.amountOutFormatted || data.quote?.expectedAmountOut} tokens.

[Verify on Explorer](${explorerUrl})`,
          type: 'text'
        }]);
        setPendingSwap(null);
        
        // Refresh balances after successful swap
        setTimeout(fetchBalances, 2000); 
      } else {
        throw new Error(data.error || 'Swap execution failed');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ Swap failed: ${error.message}`,
        type: 'text'
      }]);
    }
  };

  return {
    userAddress,
    portfolioValue,
    dailyChange,
    assets,
    messages,
    inputValue,
    setInputValue,
    sendMessage,
    executeSwap,
    clearMessages,
    isTyping,
    pendingSwap
  };
};
