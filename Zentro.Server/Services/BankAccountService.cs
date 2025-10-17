using Microsoft.EntityFrameworkCore;
using Zentro.Server.Data;
using Zentro.Server.Models;

namespace Zentro.Server.Services
{
    public class BankAccountService
    {
        private readonly IConfiguration _config;
        private readonly ZentroDbContext _db;

        public BankAccountService(
            IConfiguration config,
            ZentroDbContext db
        )
        {
            _config = config;
            _db = db;
        }

        #region Get

        public async Task<List<BankAccountResponse>> GetAll(int userId)
        {
            var bankAccounts = await _db.BankAccounts
                    .Where(b => b.UserId == userId)
                    .Select(b => new BankAccountResponse(b))
                    .ToListAsync();

            return bankAccounts;
        }

        public async Task<BankAccountResponse> Get(int userId, int bankAccountId)
        {
            var bankAccount = await _db.BankAccounts
                    .Where(b => b.UserId == userId && b.Id == bankAccountId)
                    .Select(b => new BankAccountResponse(b))
                    .FirstOrDefaultAsync();

            return bankAccount;
        }

        #endregion

        #region CreateOrUpdate

        public async Task<bool> CreateOrUpdate(BankAccount bankAccount)
        {

            await _db.BankAccounts.AddAsync(bankAccount);

            var result = await _db.SaveChangesAsync();

            return result > 0;
        }

        #endregion
    }
}