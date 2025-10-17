using Zentro.Server.Enums;

namespace Zentro.Server.Models
{
    public class BankAccount
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Bank { get; set; }
        public AccountType Type { get; set; }
        public decimal Balance { get; set; }
        public decimal? InterestRate { get; set; }
    }
    public class BankAccountResponse
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Bank { get; set; }
        public AccountType Type { get; set; }
        public decimal Balance { get; set; }
        public decimal? InterestRate { get; set; }
        public List<Transaction> Transactions { get; set; }

        public BankAccountResponse() { }
        public BankAccountResponse(BankAccount bankAccount) 
        {
            Id = bankAccount.Id;
            UserId = bankAccount.UserId;
            Bank = bankAccount.Bank;
            Type = bankAccount.Type;
            Balance = bankAccount.Balance;
            InterestRate = bankAccount.InterestRate;
            Transactions = new List<Transaction>();
        }
    }
}
