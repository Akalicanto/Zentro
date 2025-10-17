using Microsoft.AspNetCore.Mvc;
using Zentro.Server.Models;
using Zentro.Server.Services;
using Zentro.Server.Helpers;

namespace Zentro.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BanckAccountsController : ControllerBase
    {
        private readonly BankAccountService _bankAccountService;

        public BanckAccountsController(BankAccountService bankAccountService)
        {
            _bankAccountService = bankAccountService;
        }

        #region Get

        /// <summary>
        /// Devuelve todas las cuentas bancarias del usuario
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                int userId = UserHelper.GetUserId(User);

                var result = await _bankAccountService.GetAll(userId);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Devuelve la cuenta bancaria del usuario
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        [HttpGet("{bankAccountId}")]
        public async Task<IActionResult> Get(int bankAccountId)
        {
            try
            {
                int userId = UserHelper.GetUserId(User);

                var result = await _bankAccountService.Get(userId, bankAccountId);

                if (result == null)
                    return NotFound();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        #endregion

        #region CreateorUpdate

        /// <summary>
        /// Crea y actualiza una cuenta bancaria
        /// </summary>
        /// <param name="request"></param>
        /// <returns></returns>
        [HttpPost]
        public async Task<ActionResult<bool>> CreateOrUpdate([FromBody] BankAccount bankAccount)
        {
            try
            {
                if (bankAccount.UserId == 0) bankAccount.UserId = UserHelper.GetUserId(User);

                bool result = await _bankAccountService.CreateOrUpdate(bankAccount);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        #endregion

    }
}
